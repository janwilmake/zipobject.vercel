import { Parse } from "unzipper";
import { PassThrough, Readable } from "node:stream";
import * as YAML from "js-yaml";
import * as crypto from "node:crypto";
import { compile } from "./ignore.js";
import { pathFilter } from "./pathFilter.js";

type HashedEntry = {
  content: string | undefined;
  size: number;
  hash: string;
};

const streamToString = (
  stream: NodeJS.ReadableStream,
): Promise<HashedEntry | null> => {
  return new Promise<HashedEntry | null>((resolve, reject) => {
    const textChunks: Buffer[] = [];
    const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
    let size = 0;
    let isBinary = false;
    const hash = crypto.createHash("sha256");

    stream.on("data", (chunk: Buffer) => {
      size += chunk.length;
      hash.update(chunk);

      if (!isBinary) {
        try {
          // Only store chunks if we haven't detected binary
          decoder.decode(chunk, { stream: true });
          textChunks.push(chunk);
        } catch {
          isBinary = true;
          textChunks.length = 0; // Clear accumulated chunks
        }
      }
    });

    stream.on("end", () => {
      const digest = hash.digest("hex");

      if (isBinary) {
        resolve({ content: undefined, hash: digest, size });
      } else {
        const content = Buffer.concat(textChunks).toString("utf8");
        resolve({ content, size, hash: digest });
      }
    });

    stream.on("error", (err) => {
      console.log(`Err in stream entry`, err);
      resolve(null);
    });
  });
};

const cachedZipballRequest = async (
  zipUrl: string,
  headers: { [name: string]: string } | undefined,
  immutable: boolean,
) => {
  //TODO: cache with etag https://developers.cloudflare.com/r2/examples/authenticate-r2-auth-tokens/

  const url = new URL(zipUrl);

  // append a param to prevent caching
  url.searchParams.set("noCache", Date.now().toString());

  const response = await fetch(url.toString(), {
    headers,
    cache: "no-store",
  });

  return response;
};

type ContentType =
  | {
      type: "content";
      content: string;
      url: undefined;
      hash: string;
      size: number;
    }
  | {
      type: "binary";
      url: string;
      content: undefined;
      hash: string;
      size: number;
    };

export const getZipballContents = async (context: {
  zipUrl: string;
  zipHeaders?: { [name: string]: string };
  immutable: boolean;
  /** If given, will only match these filenames, case insenstive */
  matchFilenames?: string[];
  includeExt?: string[];
  excludeExt?: string[];
  yamlFilter?: string;
  shouldOmitFiles: boolean;
  allowedPaths?: string[];
  includeDir?: string[];
  excludeDir?: string[];
  disableGenignore?: boolean;
  maxFileSize?: number;
}) => {
  const {
    zipHeaders,
    zipUrl,
    immutable,
    excludeExt,
    includeExt,
    allowedPaths,
    includeDir,
    excludeDir,
    disableGenignore,
    maxFileSize,
    yamlFilter,
    matchFilenames,
  } = context;

  let yamlParse: any;
  try {
    if (yamlFilter) {
      yamlParse = YAML.load(yamlFilter);
    }
  } catch (e: any) {
    return {
      status: 500,
      message:
        "Couldn't parse yaml filter. Please esnure to provide valid url-encoded YAML. " +
        e.message,
    };
  }

  const response = await cachedZipballRequest(zipUrl, zipHeaders, immutable);

  if (!response.ok || !response.body) {
    try {
      const text = await response.text();

      return {
        message: "Not ok:" + response.status + " " + text,
        status: response.status,
      };
    } catch (e) {
      return {
        message: "Not ok:" + response.status + " " + response.statusText,
        status: response.status,
      };
    }
  }

  const fileContents: {
    [path: string]: ContentType;
  } = {};

  const nodeStream = new PassThrough();
  Readable.fromWeb(response.body as any).pipe(nodeStream);

  // TODO: add default genignore
  let genignoreString: string | null = null;

  // Stream the response and unzip it
  const unzipStream = nodeStream.pipe(Parse()).on("entry", async (entry) => {
    const filePath = entry.path.split("/").slice(1).join("/");
    const type = entry.type; // 'Directory' or 'File'

    if (type !== "File") {
      entry.autodrain();
      return;
    }

    if (filePath === ".genignore" && !disableGenignore) {
      genignoreString = (await streamToString(entry))?.content || null;
    }

    if (
      !pathFilter({
        matchFilenames,
        filePath,
        yamlParse,
        includeExt,
        excludeExt,
        includeDir,
        excludeDir,
        allowedPaths,
      })
    ) {
      // console.log(entry.path, "should not include");
      entry.autodrain();
      return;
    }
    const hashedEntry = await streamToString(entry);

    if (!hashedEntry) {
      //console.log(entry.path, "no hash entry");

      // filtering out errors
      entry.autodrain();
      return;
    }

    if (hashedEntry?.content && maxFileSize && hashedEntry.size > maxFileSize) {
      console.log(entry.path, "too big");

      // filtering out big files
      entry.autodrain();
      return;
    }

    const contentOrRawUrl: ContentType = hashedEntry.content
      ? {
          type: "content",
          content: hashedEntry.content,
          hash: hashedEntry.hash,
          size: hashedEntry?.size,
          url: undefined,
        }
      : {
          content: undefined,
          type: "binary",
          hash: hashedEntry?.hash,
          size: hashedEntry?.size,
          // TODO: figure out how to make this generic. probably by storing this stuff in S3, and a separate endpoint
          url: "",
          //url: `https://raw.githubusercontent.com/${owner}/${repo}/${shaOrBranch}/${filePath}`,
        };

    fileContents[filePath] = contentOrRawUrl;
  });

  // Wait until the stream is finished
  await new Promise((resolve, reject) => {
    unzipStream.on("end", resolve);
    unzipStream.on("error", reject);
  });

  const genignore =
    genignoreString && !disableGenignore ? compile(genignoreString) : undefined;
  const unignoredFilePaths = Object.keys(fileContents).filter((p) =>
    genignore ? genignore.accepts(p) : true,
  );

  const final: { [path: string]: ContentType } = {};
  unignoredFilePaths.map((p) => {
    final["/" + p] = fileContents[p];
  });

  return { status: 200, result: final };
};
