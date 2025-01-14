import { ReadableStream as WebReadableStream } from "node:stream/web";
import { getZipUrl } from "../src/getZipUrl.js";
import { JSONStreamer } from "../src/JSONStreamer.js";
import { ZipStreamer } from "../src/ZipStreamer.js";
import { createTarballStream } from "../src/createTarballStream.js";
import { createZipballStream } from "../src/createZipballStream.js";
import { BallOptions } from "../src/types.js";

export const GET = async (request: Request, context: { waitUntil: any }) => {
  const url = new URL(request.url);
  const apiKey =
    url.searchParams.get("apiKey") ||
    request.headers.get("Authorization")?.slice("Bearer ".length);
  const immutableQuery = url.searchParams.get("immutable");
  const zipUrlQuery = url.searchParams.get("zipUrl");
  const siteUrl = url.searchParams.get("url");
  const zipType = url.searchParams.get("zipType");
  const urlParse = zipUrlQuery
    ? {
        zipUrl: zipUrlQuery,
        immutable: immutableQuery === "true",
        zipHeaders: { Authorization: `Bearer ${apiKey}` },
        type: zipType === "tarball" ? "tarball" : "zipball",
        path: undefined,
      }
    : siteUrl
    ? getZipUrl(siteUrl, apiKey)
    : { error: "Please provide either zipUrl or url" };
  if ("error" in urlParse) {
    if (request.headers.get("accept")?.includes("text/html")) {
      return new Response("Invalid input url/zipUrl", {
        status: 307,
        headers: {
          Location: url.origin + "/openapi.html#/operations/getZipContents",
        },
      });
    }
    return new Response("Invalid input url/zipUrl:" + urlParse.error, {
      status: 400,
    });
  }

  const { zipHeaders, zipUrl, immutable, type, path } = urlParse;
  console.log({ zipUrl, path });

  //  TODO: we could already cache immutable zips at this point, instead of just caching after filtering, we could cache instantly when retrieving, but also after the filter.
  const disableCache = url.searchParams.get("disableCache") === "true";

  const allowedPathsQuery = url.searchParams.getAll("allowedPaths");
  const allowedPaths = allowedPathsQuery.length
    ? allowedPathsQuery
    : path
    ? [path]
    : undefined;

  const shouldOmitFiles = url.searchParams.get("omitFiles") === "true";
  // only for JSON
  const shouldOmitTree = url.searchParams.get("omitTree") === "true";

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

  const options: BallOptions = {
    allowedPaths,
    maxTokens,
    zipUrl,
    zipHeaders,
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
        : await createZipballStream(options);

    const streamHandler =
      accept === "application/zip"
        ? new ZipStreamer()
        : new JSONStreamer({
            shouldOmitFiles,
            shouldOmitTree,
            disableGenignore,
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

    // Return the streaming response
    return new Response(webStream as unknown as BodyInit, {
      headers: {
        "Content-Type":
          accept === "application/zip" ? "application/zip" : "application/json",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error: any) {
    console.error("Stream processing error:", error);
    return new Response(`Error processing request: ${error.message}`, {
      status: 500,
    });
  }
};
