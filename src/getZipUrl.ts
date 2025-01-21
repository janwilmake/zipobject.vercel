function isValidGitSHA(str: string) {
  const shaPattern = /^[0-9a-f]{40}$/i;
  return shaPattern.test(str);
}

export type ZipType = "zipball" | "tarball";

export type ZipInfo = {
  dataUrl: string;
  rawUrlPrefix: string;
  immutable: boolean;
  path: string | undefined;
  response: Response;
};
/** Parses zip url, headers, and immutability for common package managers and file systems */
export const getZipUrl = async (
  siteUrl: string,
  apiKey?: string,
): Promise<ZipInfo | { error: string }> => {
  //normalize url
  siteUrl =
    siteUrl.startsWith("https:/") && !siteUrl.startsWith("https://")
      ? siteUrl.replace("https:/", "https://")
      : !siteUrl.startsWith("https://") && !siteUrl.startsWith("http://")
      ? `https://` + siteUrl
      : siteUrl;
  let url: URL;
  try {
    url = new URL(siteUrl);
  } catch (e) {
    return { error: "Can't parse URL" };
  }

  if (siteUrl.startsWith("https://github.com/")) {
    const [owner, repo, page, branch, ...pathChunks] = url.pathname
      .slice(1)
      .split("/");
    const path = pathChunks ? pathChunks.join("/") : undefined;
    const wikiRegex = /^([\w-]+)\/([\w-]+)\/wiki(\/.*)?$/;
    const wikiMatch = url.pathname.slice(1).match(wikiRegex);
    if (wikiMatch) {
      const pathAfterWiki: string = wikiMatch[3]?.slice(1) || "";
      const dataUrl = `https://wikizip.forgithub.com/${owner}/${repo}/wiki`;
      const response = await fetch(dataUrl);
      return {
        immutable: false,
        dataUrl,
        path: pathAfterWiki,
        response,
        rawUrlPrefix: `https://raw.githubusercontent.com/wiki/${owner}/${repo}`,
      };
    }

    // parse github URL
    const ref = branch && branch !== "" ? branch : `HEAD`;
    const isPrivate = !!apiKey;
    const branchSuffix = branch && branch !== "" ? `/${branch}` : "";
    const dataUrl = isPrivate
      ? `https://api.github.com/repos/${owner}/${repo}/zipball${branchSuffix}`
      : `https://github.com/${owner}/${repo}/archive/${ref}.zip`;
    const zipHeaders = isPrivate
      ? { Authorization: `token ${apiKey}` }
      : undefined;
    const response = await fetch(dataUrl, { headers: zipHeaders });
    const rawUrlPrefix = `https://raw.githubusercontent.com/${owner}/${repo}/${response.url.slice(
      `https://codeload.github.com/${owner}/${repo}/zip/`.length,
    )}`;

    const immutable = isValidGitSHA(branch);

    return {
      immutable,
      dataUrl,
      path,
      rawUrlPrefix,
      response,
    };
  }

  if (siteUrl.startsWith("https://npmjs.com/")) {
    const [_, packageName, __, version] = url.pathname.slice(1).split("/");
    if (!version) {
      return {
        error: "NPM Version must be specified in format /packageName/v/version",
      };
    }
    const dataUrl = `https://registry.npmjs.org/${packageName}/-/${packageName}-${version}.tgz`;
    const response = await fetch(dataUrl);

    // NB: Private packages not supported, for now.
    return {
      response,
      immutable: true,
      dataUrl,
      path: undefined,
      rawUrlPrefix: `https://unpkg.com/${packageName}@${version}`,
    };
  }

  if (siteUrl.startsWith("https://jsr.io/")) {
    //https://jsr.io/@cfa/fetch-each@1.0.14

    // Match the pattern @owner/package-name@version
    const regex = /^@([^/]+)\/([^@]+)@(.+)$/;
    const match = url.pathname.slice(1).match(regex);

    if (!match) {
      return { error: "Could not parse JSR" };
    }

    const [, owner, packageName, version] = match;
    const dataUrl = `https://npm.jsr.io/~/11/@jsr/${owner}__${packageName}/${version}.tgz`;
    const response = await fetch(dataUrl);

    // NB: seems consistent to always be ~11 but let's see
    return {
      response,
      immutable: true,
      dataUrl,
      path: undefined,
      rawUrlPrefix: `https://jsr.io/@[${owner}/${packageName}/${version}`,
    };
  }
  return { error: "URL not supported" };
};
export const zipPrefixesWithFirstSegmentOmitted = [
  "https://npm.jsr.io/",
  "https://registry.npmjs.org/",
  "https://api.github.com/",
  "https://github.com/",
];
