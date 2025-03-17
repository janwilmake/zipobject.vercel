import { Readable } from "node:stream";
import { ReadableStream as WebReadableStream } from "node:stream/web";
import {
  getZipUrl,
  ZipInfo,
  zipPrefixesWithFirstSegmentOmitted,
} from "../src/getZipUrl.js";
import { JSONStreamer } from "../src/JSONStreamer.js";
import { MarkdownStreamer } from "../src/MarkdownStreamer.js";
import { HTMLStreamer } from "../src/HTMLStreamer.js";
import { YAMLStreamer } from "../src/YAMLStreamer.js";
import { JSONSequenceStreamer } from "../src/JSONSequenceStreamer.js";
import { ZipStreamer } from "../src/ZipStreamer.js";
import { createTarballStream } from "../src/createTarballStream.js";
import { createZipballStream } from "../src/createZipballStream.js";
import { createJsonStream } from "../src/createJsonStream.js";
import { BallOptions } from "../src/types.js";
import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { Transform } from "node:stream";

import { Upload } from "@aws-sdk/lib-storage";

const client = new S3Client({
  region: process.env.AWS_REGION,
  endpoint: process.env.S3_ENDPOINT,
});

const cacheGet = async (Prefix: string, filterHashes: string[]) => {
  const cacheKey = `${Prefix}${filterHashes[0]}.zip`;
  // todo
  try {
    const list = await client.send(
      new ListObjectsV2Command({
        Bucket: process.env.S3_BUCKET_NAME,
        Prefix,
      }),
    );
    console.log({ list });

    const result = await client.send(
      new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: cacheKey,
      }),
    );
    return { result, error: undefined };
  } catch (e: any) {
    return { result: undefined, error: e.message as string };
  }
};

const cachePut = async (
  cacheKey: string,
  body: Readable,
  metadata: { [keyof: string]: string },
) => {
  try {
    const parallelUploads3 = new Upload({
      client,
      params: {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: cacheKey,
        Body: body,
        Metadata: metadata,
      },

      // // optional tags
      // tags: [
      //   /*...*/
      // ],

      // // additional optional fields show default values below:

      // // (optional) concurrency configuration
      // queueSize: 4,

      // // (optional) size of each part, in bytes, at least 5MB
      // partSize: 1024 * 1024 * 5,

      // // (optional) when true, do not automatically call AbortMultipartUpload when
      // // a multipart upload fails to complete. You should then manually handle
      // // the leftover parts.
      // leavePartsOnError: false,
    });

    console.log("UPLOAD STARTED");
    parallelUploads3.on("httpUploadProgress", (progress) => {
      console.log(progress);
    });

    const result = await parallelUploads3.done();

    return result;
  } catch (e) {
    console.log(e);
  }
};

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

type SortedFilters = {
  maxTokens: number | undefined;
  matchFilenames: string[] | undefined;
  yamlString: string | undefined;
  maxFileSize: number | undefined;
  disableGenignore: boolean;
  excludeDir: string[] | undefined;
  excludeExt: string[] | undefined;
  includeDir: string[] | undefined;
  includeExt: string[] | undefined;
  allowedPaths: string[] | undefined;
  // New parameters
  enableFuzzyMatching: boolean;
  excludePathPatterns: string | undefined;
  pathPatterns: string | undefined;
  search: string | undefined;
  searchCaseSensitive: boolean;
  searchMatchWholeWord: boolean;
  searchUseRegex: boolean;
};

const getBroadeningFilterHashes = async (sortedFilterObject: SortedFilters) => {
  // TODO: make it incrementally less specific / more broad
  const sortedFilterObjects = [sortedFilterObject];
  // less specific for each path is more broad
  //  allowedPaths,
  // disabled is more broad
  // disableGenignore,
  // less is more broad
  //  excludeDir,
  // less is more broad
  // excludeExt,
  // none is most broad, then more is more broad
  // includeDir,
  // none is most broad, then more is more broad
  // includeExt,
  // not given is most broad, and if given, more files is more broad
  // matchFilenames,
  // bigger is more broad, or not given is most.
  // maxFileSize,
  // bigger is more broad, or not given is most.
  // maxTokens,
  // not given is more broad

  const filterHashes = await Promise.all(
    sortedFilterObjects.map((obj) => JSON.stringify(obj)).map(hashString),
  );
  return filterHashes;
};

function getSearchParam(url: string, paramName: string): string | null {
  const regex = new RegExp(`[?&]${paramName}=([^&]*)`, "i");
  const match = url.match(regex);
  if (match && match[1]) {
    return decodeURIComponent(match[1]);
  }
  return null;
}

/** Gets the filters that the cache relies on */
/** Gets the filters that the cache relies on */
const getSortedFilters = (
  requestUrl: string,
  path: string | undefined,
): SortedFilters => {
  const url = new URL(requestUrl);
  const allowedPathsQuery = url.searchParams
    .getAll("allowedPaths")
    .sort((a, b) => (b < a ? -1 : 1));
  const allowedPaths = allowedPathsQuery.length
    ? allowedPathsQuery
    : path !== undefined && path !== ""
    ? [path]
    : undefined;

  const disableGenignore =
    !url.searchParams.get("disableGenignore") ||
    url.searchParams.get("disableGenignore") !== "false";
  const maxFileSize =
    parseInt(url.searchParams.get("maxFileSize") || "0", 10) || undefined;
  const maxTokensQuery = url.searchParams.get("maxTokens");
  const excludeDir = url.searchParams
    .get("exclude-dir")
    ?.split(",")
    .map((x) => x.trim());
  const excludeExt = url.searchParams
    .get("exclude-ext")
    ?.split(",")
    .map((x) => x.trim());
  const includeDir = url.searchParams
    .get("dir")
    ?.split(",")
    .map((x) => x.trim());
  const includeExt = url.searchParams
    .get("ext")
    ?.split(",")
    .map((x) => x.trim());
  const yamlString = url.searchParams.get("yamlString") || undefined;
  // match these filenames, case insensitive
  const matchFilenames = url.searchParams
    .get("matchFilenames")
    ?.split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)
    .sort((a, b) => (b < a ? -1 : 1));

  const maxTokens =
    maxTokensQuery && !isNaN(Number(maxTokensQuery))
      ? Number(maxTokensQuery)
      : undefined;

  // Add the new parameters
  const enableFuzzyMatching =
    url.searchParams.get("enableFuzzyMatching") === "true";

  const excludePathPatterns =
    url.searchParams.get("excludePathPatterns") || undefined;

  const pathPatterns = url.searchParams.get("pathPatterns") || undefined;
  const searchParam = url.searchParams.get("search");
  const search = searchParam ? atob(searchParam) : undefined;
  console.log(JSON.stringify({ requestUrl, searchParam, search }));
  const searchCaseSensitive =
    url.searchParams.get("searchCaseSensitive") === "true";

  const searchMatchWholeWord =
    url.searchParams.get("searchMatchWholeWord") === "true";

  const searchUseRegex = url.searchParams.get("searchUseRegex") === "true";

  return {
    excludeDir,
    excludeExt,
    includeDir,
    includeExt,
    maxTokens,
    matchFilenames,
    yamlString,
    maxFileSize,
    disableGenignore,
    allowedPaths,
    // Add the new parameters to the returned object
    enableFuzzyMatching,
    excludePathPatterns,
    pathPatterns,
    search,
    searchCaseSensitive,
    searchMatchWholeWord,
    searchUseRegex,
  };
};

/**
 * Hashes a string and returns alphanumeric characters (A-Z, a-z, 0-9)
 * with relatively uniform distribution
 */
export async function hashString(str: string): Promise<string> {
  const buffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  // Define our character set
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  // Map each byte to a character in our charset
  return hashArray
    .map((byte) => {
      // Use modulo to map the byte to our charset length
      const index = byte % charset.length;
      return charset[index];
    })
    .join("");
}

class UrlResponse extends Response {
  private _url: string;
  constructor(body: BodyInit | null, init: ResponseInit & { url: string }) {
    super(body, init);
    this._url = init.url;
  }

  get url() {
    return this._url;
  }
}

export const GET = async (request: Request, context: { waitUntil: any }) => {
  const url = new URL(request.url);

  const apiKey =
    url.searchParams.get("apiKey") ||
    request.headers.get("Authorization")?.slice("Bearer ".length);

  if (
    (!apiKey ||
      apiKey !== process.env.ADMIN_SECRET ||
      !process.env.ADMIN_SECRET) &&
    process.env.NODE_ENV !== "development"
  ) {
    return new Response(
      !process.env.ADMIN_SECRET
        ? "No admin secret set"
        : "Invalid admin secret provided",
      { status: 401 },
    );
  }

  const zipApiKey = request.headers.get("x-zip-api-key") || undefined;
  const immutableQuery = url.searchParams.get("immutable");
  const pathUrl = url.searchParams.get("pathUrl");
  if (!pathUrl) {
    return new Response("No pathurl", { status: 500 });
  }

  // first, try to get a zip url from the url with a specific format:
  let urlParse: ZipInfo | undefined = undefined;

  const siteUrlParse = getZipUrl(pathUrl, zipApiKey);

  if ("dataUrl" in siteUrlParse) {
    urlParse = siteUrlParse;
  } else {
    try {
      new URL(pathUrl);
    } catch (e) {
      return new Response("Invalid URL: " + pathUrl, { status: 400 });
    }

    urlParse = {
      zipHeaders: zipApiKey
        ? { Authorization: `Bearer ${zipApiKey}` }
        : undefined,
      dataUrl: pathUrl,
      getRawUrlPrefix: () =>
        `https://zipobject.com/file/${encodeURIComponent(pathUrl)}/path`,
      immutable: immutableQuery === "true",
      path: undefined,
    };
  }

  if (!urlParse) {
    return new Response("Shouldn't happen", { status: 500 });
  }

  const { dataUrl, immutable, path, getRawUrlPrefix, zipHeaders } = urlParse;

  const needChecksum = !immutable || !!zipHeaders;

  console.log({ needChecksum, zipHeaders, dataUrl });
  const earlyResponse = needChecksum
    ? await fetch(dataUrl, { method: "GET", headers: zipHeaders })
    : undefined;

  if (earlyResponse && !earlyResponse.ok) {
    try {
      const text = await earlyResponse.text();
      // This way we make sure we don't accidentally provide a cache if we're unauthenticated.
      return new Response(
        `Data URL could not be retrieved. Status code: ${earlyResponse.status} - ${earlyResponse.statusText}
    
Data URL: ${dataUrl}

Text:
${text}`,
        { status: earlyResponse.status },
      );
    } catch (e) {
      return new Response(
        `Data URL could not be retrieved. Status code: ${earlyResponse.status}
      
  Data URL: ${dataUrl}`,
        { status: earlyResponse.status },
      );
    }
  }

  const sortedFilters = getSortedFilters(request.url, path);

  const {
    allowedPaths,
    disableGenignore,
    excludeDir,
    excludeExt,
    includeDir,
    includeExt,
    matchFilenames,
    maxFileSize,
    maxTokens,
    yamlString,
    enableFuzzyMatching,
    excludePathPatterns,
    pathPatterns,
    search,
    searchCaseSensitive,
    searchMatchWholeWord,
    searchUseRegex,
  } = sortedFilters;

  const shouldOmitFiles = url.searchParams.get("omitFiles") === "true";
  // only for JSON
  const shouldOmitTree = url.searchParams.get("omitTree") === "true";

  const plugins =
    url.searchParams
      .get("plugins")
      ?.split(",")
      .map((x) => x.toLowerCase().trim())
      .sort((a, b) => (b < a ? -1 : 1)) || [];

  const disableCache = url.searchParams.get("disableCache") === "true";

  console.time("cache check");

  // NB: not every  zip response has an etag. Thus, we should also look at other things to determine it has changed, or decide not to cache if we just can't know.
  const checksum =
    needChecksum && earlyResponse
      ? earlyResponse.headers.get("etag") ||
        earlyResponse.headers.get("last-modified") ||
        earlyResponse.headers.get("content-md5") ||
        Math.random().toString()
      : // if the zip is immutable, we must use the headers as a checksum, if present, since different headers may mean different authenticated user
        JSON.stringify(zipHeaders);

  const dataUrlWithoutProtocol = dataUrl.startsWith("https://")
    ? dataUrl.slice("https://".length)
    : dataUrl.startsWith("http://")
    ? dataUrl.slice("http://".length)
    : dataUrl;
  const dataUrlWithoutExt = dataUrlWithoutProtocol.endsWith(".zip")
    ? dataUrlWithoutProtocol.slice(0, dataUrlWithoutProtocol.length - 4)
    : dataUrlWithoutProtocol;

  const checksumPart = await hashString(checksum);

  // This already contains the dataURL and the checksum meaning it is authenticated and doesn't get old versions or different files
  const prefix = `${dataUrlWithoutExt}/${checksumPart}/`;
  // This ensures we go incrementally more broad if the hash doesn't exist.
  const filterHashes = await getBroadeningFilterHashes(sortedFilters);

  const cache = await cacheGet(prefix, filterHashes);

  // cache available? response is from cache

  const cacheReadableStream = cache.result?.Body?.transformToWebStream();
  const isCacheHit = !!cacheReadableStream;
  // cache not available? resposne is early response or get resposne now....

  const response =
    cacheReadableStream && cache.result?.Metadata?.url
      ? new UrlResponse(cacheReadableStream, {
          url: cache.result?.Metadata.url,
          // set content-type so 'type' gets determined correctly
          headers: { "content-type": "application/zip" },
        })
      : earlyResponse || (await fetch(dataUrl, { headers: zipHeaders }));

  // check if it's a valid url

  //  TODO: we could already cache immutable zips at this point, instead of just caching after filtering, we could cache instantly when retrieving, but also after the filter.
  const accept =
    url.searchParams.get("accept") || request.headers.get("Accept");

  // try it
  if (!response.ok || !response.body) {
    throw new Error(`Failed to fetch data url: ${response.status}`);
  }

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
    rawUrlPrefix: getRawUrlPrefix(response.url),
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
    omitFiles: shouldOmitFiles,
    yamlString,
    enableFuzzyMatching,
    excludePathPatterns,
    pathPatterns,
    search,
    searchCaseSensitive,
    searchMatchWholeWord,
    searchUseRegex,
  };

  console.log({ type, options });

  try {
    // Create and set up Node.js streams
    const { cacheStream, outputStream, searchRegex } =
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
      "text/yaml",
      "text/markdown",
      "text/html",
    ];
    const responseContentType =
      accept && possibleResponseTypes.includes(accept)
        ? accept
        : possibleResponseTypes[0];

    console.log({ responseContentType, accept });
    const streamHandler =
      responseContentType === "application/zip"
        ? new ZipStreamer()
        : responseContentType === "application/json-seq"
        ? new JSONSequenceStreamer({
            shouldOmitFiles,
            shouldOmitTree,
            disableGenignore,
            plugins,
            searchRegex,
          })
        : responseContentType === "text/yaml"
        ? new YAMLStreamer({
            shouldOmitFiles,
            shouldOmitTree,
            disableGenignore,
            plugins,
            searchRegex,
          })
        : responseContentType === "text/markdown"
        ? new MarkdownStreamer({
            shouldOmitFiles,
            shouldOmitTree,
            disableGenignore,
            plugins,
            searchRegex,
          })
        : responseContentType === "text/html"
        ? new HTMLStreamer({
            href: url.toString(),
            shouldAddLineNumbers: true,
            ogImageUrl: "",
            shouldOmitFiles,
            shouldOmitTree,
            disableGenignore,
            plugins,
            searchRegex,
          })
        : new JSONStreamer({
            shouldOmitFiles,
            shouldOmitTree,
            disableGenignore,
            plugins,
            searchRegex,
          });

    // Set up the pipeline in Node.js streams
    const nodeStream = outputStream.pipe(streamHandler);
    /* if (!isCacheHit && !disableCache) {
            console.log("GONNA CACHE");
            // Create a ZipStreamer to transform the content into a ZIP stream
            // Pipe the content through the ZipStreamer and then to the cache stream
            const cachedPipe = cacheStream.pipe(new ZipStreamer());
            cachedPipe.on("error", (err) => {
              console.error("Cache stream error:", err);
            });

            //  const webStream = nodeToWebStream(cachedPipe.pipe(zipStreamer));
            // Handle errors in the cache stream
            console.log({ type });
            // Add the zip result to cache by streaming it there too
            const result = await cachePut(cacheKey, cachedPipe, {
              url: response.url,
            });
            console.log("PutObjectCommandOutput", { result });
          }*/
    const createWebStream = (stream: Transform) => {
      return new WebReadableStream({
        async start(controller) {
          stream.on("data", (chunk) => {
            controller.enqueue(chunk);
          });
          stream.on("end", () => {
            controller.close();
          });
          stream.on("error", (err) => {
            controller.error(err);
          });
        },

        cancel() {
          stream.destroy();
        },
      });
    };

    // Create a web-compatible ReadableStream
    const webStream = createWebStream(nodeStream);

    const headers = {
      "Content-Type": responseContentType + ";charset=utf8",
      "X-XSS-Protection": "1; mode=block",
      "X-Frame-Options": "DENY",
      "Transfer-Encoding": "chunked",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": immutable
        ? "public, max-age=31536000, immutable"
        : "no-cache",
      "Content-Disposition":
        responseContentType === "application/zip"
          ? `attachment; filename="${getFilename(
              pathUrl,
              responseContentType,
            )}"`
          : "inline",
    };

    return new Response(webStream as unknown as BodyInit, { headers });
  } catch (error: any) {
    console.error("Stream processing error:", error);
    return new Response(`Error processing request: ${error.message}`, {
      status: 500,
    });
  }
};
