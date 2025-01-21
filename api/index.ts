import { ReadableStream as WebReadableStream } from "node:stream/web";
import {
  getZipUrl,
  ZipInfo,
  zipPrefixesWithFirstSegmentOmitted,
} from "../src/getZipUrl.js";
import { JSONStreamer } from "../src/JSONStreamer.js";
import { JSONSequenceStreamer } from "../src/JSONSequenceStreamer.js";
import { ZipStreamer } from "../src/ZipStreamer.js";
import { createTarballStream } from "../src/createTarballStream.js";
import { createZipballStream } from "../src/createZipballStream.js";
import { createJsonStream } from "../src/createJsonStream.js";
import { BallOptions } from "../src/types.js";

const getFilename = (url: string, responseContentType: string): string => {
  const ext =
    responseContentType === "application/json-seq" ? "jsonseq" : "zip";

  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/").filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];
    const baseName = lastPart.split(".")[0];
    return `${baseName}.${ext}`;
  } catch {
    return `repository.${ext}`;
  }
};
type FileType = "zipball" | "tarball" | "compressed" | "json" | "unknown";

const MIME_TYPE_MAP = {
  // ZIP types
  "application/zip": "zipball",
  "application/x-zip-compressed": "zipball",
  // TAR types
  "application/x-tar": "tarball",
  "application/gzip": "tarball",
  "application/x-gzip": "tarball",
  // Other compressed types
  "application/x-7z-compressed": "compressed",
  "application/x-rar-compressed": "compressed",
  "application/x-bzip2": "compressed",
  "application/x-xz": "compressed",
  "application/x-lzma": "compressed",
  "application/x-compressed": "compressed",
  "application/x-archive": "compressed",
  // JSON types
  "application/json": "json",
  "application/x-json": "json",
} as const;

function getExtensionFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const lastDotIndex = pathname.lastIndexOf(".");
    if (lastDotIndex === -1) return "";
    return pathname.slice(lastDotIndex + 1).toLowerCase();
  } catch {
    // If URL parsing fails, try to get extension from the string directly
    const lastDotIndex = url.lastIndexOf(".");
    if (lastDotIndex === -1) return "";
    return url.slice(lastDotIndex + 1).toLowerCase();
  }
}

function detectFileType(contentType: string | null, url: string): FileType {
  // First check based on content type
  const normalizedContentType = contentType?.toLowerCase();
  const typeFromMime =
    MIME_TYPE_MAP[normalizedContentType as keyof typeof MIME_TYPE_MAP];

  if (typeFromMime) {
    return typeFromMime;
  }

  // If content type is octet-stream or unknown, check file extension
  if (
    normalizedContentType === "application/octet-stream" ||
    !normalizedContentType
  ) {
    const extension = getExtensionFromUrl(url);

    // Check extensions
    if (extension === "zip") {
      return "zipball";
    }

    if (["tar", "tgz", "gz"].includes(extension)) {
      return "tarball";
    }

    if (["7z", "rar", "bz2", "xz", "lzma"].includes(extension)) {
      return "compressed";
    }

    if (extension === "json") {
      return "json";
    }
  }

  return "unknown";
}

export const GET = async (request: Request, context: { waitUntil: any }) => {
  const url = new URL(request.url);
  const apiKey =
    url.searchParams.get("apiKey") ||
    request.headers.get("Authorization")?.slice("Bearer ".length);
  const immutableQuery = url.searchParams.get("immutable");
  const pathUrl = url.searchParams.get("pathUrl");
  const zipType = url.searchParams.get("zipType");
  if (!pathUrl) {
    return new Response("No pathurl", { status: 500 });
  }

  // first, try to get a zip url from the url with a specific format:
  let urlParse: ZipInfo | undefined = undefined;

  const siteUrlParse = await getZipUrl(pathUrl, apiKey);

  if ("dataUrl" in siteUrlParse) {
    urlParse = siteUrlParse;
  } else {
    try {
      new URL(pathUrl);
    } catch (e) {
      return new Response("Invalid URL: " + pathUrl, { status: 400 });
    }

    const response = await fetch(pathUrl, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
    });

    urlParse = {
      response,
      dataUrl: pathUrl,
      rawUrlPrefix: `https://zipobject.com/file/${encodeURIComponent(
        pathUrl,
      )}/path`,
      immutable: immutableQuery === "true",
      path: undefined,
    };
  }

  if (!urlParse) {
    return new Response("Shouldn't happen", { status: 500 });
  }

  const { dataUrl, immutable, path, rawUrlPrefix, response } = urlParse;

  // check if it's a valid url

  //  TODO: we could already cache immutable zips at this point, instead of just caching after filtering, we could cache instantly when retrieving, but also after the filter.
  const disableCache = url.searchParams.get("disableCache") === "true";

  const allowedPathsQuery = url.searchParams.getAll("allowedPaths");
  const allowedPaths = allowedPathsQuery.length
    ? allowedPathsQuery
    : path !== undefined && path !== ""
    ? [path]
    : undefined;

  const shouldOmitFiles = url.searchParams.get("omitFiles") === "true";
  // only for JSON
  const shouldOmitTree = url.searchParams.get("omitTree") === "true";

  const plugins = url.searchParams.get("plugins")?.split(",") || [];
  const includeExt = url.searchParams.get("ext")?.split(",");
  const includeDir = url.searchParams.get("dir")?.split(",");
  const excludeExt = url.searchParams.get("exclude-ext")?.split(",");
  const excludeDir = url.searchParams.get("exclude-dir")?.split(",");
  const disableGenignore =
    !url.searchParams.get("disableGenignore") ||
    url.searchParams.get("disableGenignore") !== "false";
  const maxFileSize =
    parseInt(url.searchParams.get("maxFileSize") || "0", 10) || undefined;
  const maxTokensQuery = url.searchParams.get("maxTokens");
  const accept =
    url.searchParams.get("accept") || request.headers.get("Accept");
  const yamlFilter = url.searchParams.get("yamlFilter") || undefined;

  // match these filenames, case insensitive
  const matchFilenames = url.searchParams
    .get("matchFilenames")
    ?.split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  const maxTokens =
    maxTokensQuery && !isNaN(Number(maxTokensQuery))
      ? Number(maxTokensQuery)
      : undefined;

  // try it
  if (!response.ok || !response.body) {
    throw new Error(`Failed to fetch data url: ${response.status}`);
  }

  console.log({
    dataUrl,
    responseUrl: response.url,
    redirected: response.redirected,
  });

  const contentType = response.headers.get("content-type");

  const type = detectFileType(contentType, dataUrl);

  if (type === "unknown") {
    return new Response("Unknown file format: " + contentType, { status: 400 });
  }
  if (type === "compressed") {
    return new Response("Compression format not supported", { status: 400 });
  }

  // omit if we are getting a zipfile from one of the URLs were we expect it to be containing a single folder in the root
  const omitFirstSegment =
    type === "zipball" || type === "tarball"
      ? !!zipPrefixesWithFirstSegmentOmitted.find((prefix) =>
          dataUrl.startsWith(prefix),
        )
      : false;

  const options: BallOptions = {
    response,
    omitFirstSegment,
    rawUrlPrefix,
    allowedPaths,
    maxTokens,
    immutable,
    disableGenignore,
    excludeDir,
    excludeExt,
    includeDir,
    includeExt,
    matchFilenames,
    maxFileSize,
    shouldOmitFiles,
    yamlFilter,
  };

  try {
    // Create and set up Node.js streams
    const contentStream =
      type === "tarball"
        ? await createTarballStream(options)
        : type === "zipball"
        ? await createZipballStream(options)
        : await createJsonStream(options);

    const possibleResponseTypes = [
      // json: default
      "application/json",
      "application/zip",
      "application/json-seq",
    ];
    const responseContentType =
      accept && possibleResponseTypes.includes(accept)
        ? accept
        : possibleResponseTypes[0];

    const streamHandler =
      responseContentType === "application/zip"
        ? new ZipStreamer()
        : responseContentType === "application/json-seq"
        ? new JSONSequenceStreamer({
            shouldOmitFiles,
            shouldOmitTree,
            disableGenignore,
            plugins,
          })
        : new JSONStreamer({
            shouldOmitFiles,
            shouldOmitTree,
            disableGenignore,
            plugins,
          });

    // Set up the pipeline in Node.js streams
    const nodeStream = contentStream.pipe(streamHandler);

    // Create a web-compatible ReadableStream
    const webStream = new WebReadableStream({
      start(controller) {
        nodeStream.on("data", (chunk) => {
          controller.enqueue(chunk);
        });
        nodeStream.on("end", () => {
          controller.close();
        });
        nodeStream.on("error", (err) => {
          controller.error(err);
        });
      },
      cancel() {
        nodeStream.destroy();
      },
    });

    const headers = {
      "Content-Type": responseContentType!,
      "Transfer-Encoding": "chunked",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": immutable
        ? "public, max-age=31536000, immutable"
        : "no-cache",
      "Content-Disposition":
        responseContentType === "application/json"
          ? "inline"
          : `attachment; filename="${getFilename(
              pathUrl,
              responseContentType,
            )}"`,
    };

    return new Response(webStream as unknown as BodyInit, {
      headers,
    });
  } catch (error: any) {
    console.error("Stream processing error:", error);
    return new Response(`Error processing request: ${error.message}`, {
      status: 500,
    });
  }
};
