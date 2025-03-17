import { extract } from "tar-stream";
import { PassThrough, Readable } from "node:stream";
import { createHash } from "node:crypto";
import { createGunzip } from "zlib";
import { compile } from "./ignore.js";
import * as YAML from "yaml";
import { pathFilter } from "./pathFilter.js";

type HashedEntry = {
  content?: string;
  size: number;
  hash: string;
  type: "binary" | "content";
  url?: string;
};

const streamToString = (
  stream: NodeJS.ReadableStream,
): Promise<HashedEntry | null> => {
  const chunks: any[] = [];

  return new Promise<HashedEntry | null>((resolve, reject) => {
    const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false });
    let size = 0;
    let isBinary = false;
    const hash = createHash("sha256");

    stream.on("data", (chunk: Buffer) => {
      size += chunk.length;
      hash.update(chunk);

      try {
        // Decode each chunk to check for UTF-8 validity
        decoder.decode(chunk, { stream: true });
      } catch (error) {
        isBinary = true;
        // If an error is thrown, the stream is not valid UTF-8
      }
      //push the chunk either way
      chunks.push(chunk);
    });

    stream.on("end", () => {
      const digest = hash.digest("hex");

      if (isBinary) {
        const content = Buffer.concat(chunks).toString("base64");
        resolve({ type: "binary", content, hash: digest, size });
      } else {
        const content = Buffer.concat(chunks).toString("utf8");
        resolve({
          type: "content",
          content,
          size: content.length,
          hash: digest,
        });
      }
    });

    stream.on("error", (err) => {
      console.log(`Err in stream entry`, err);
      resolve(null);
    });
  });
};

export const getTarballContents = async (context: {
  zipUrl: string;
  zipHeaders?: { [name: string]: string };
  immutable: boolean;
  matchFilenames?: string[];
  includeExt?: string[];
  excludeExt?: string[];
  yamlFilter?: string;
  shouldOmitFiles?: boolean;
  allowedPaths?: string[];
  includeDir?: string[];
  excludeDir?: string[];
  disableGenignore?: boolean;
  maxFileSize?: number;
}) => {
  // Parse YAML filter if provided
  let yamlParse: any;
  try {
    if (context?.yamlFilter) {
      yamlParse = YAML.parse(context.yamlFilter);
    }
  } catch (e: any) {
    return {
      status: 500,
      message:
        "Couldn't parse yaml filter. Please ensure to provide valid url-encoded YAML. " +
        e.message,
    };
  }

  const response = await fetch(context.zipUrl, { headers: context.zipHeaders });

  if (!response.ok || !response.body) {
    return {
      message: "Failed to fetch npm package. " + response.status,
      status: response.status,
    };
  }

  const fileContents: {
    [path: string]: HashedEntry;
  } = {};

  const nodeStream = new PassThrough();
  Readable.fromWeb(response.body as any).pipe(nodeStream);

  let genignoreString: string | null = null;

  // Stream the response, decompress it, and parse the tar
  const parser = extract({});
  nodeStream.pipe(createGunzip()).pipe(parser);

  parser.on("entry", async (header: any, stream: any, next: any) => {
    const filePath = "/" + header.name.split("/").slice(1).join("/");
    const type = header.type; // 'directory' or 'file'

    if (type !== "file") {
      stream.resume();
      next();
      return;
    }

    // Handle .genignore file
    if (filePath === "/.genignore" && !context?.disableGenignore) {
      genignoreString = (await streamToString(stream))?.content || null;
      stream.resume();
      next();
      return;
    }

    // Check if file should be included based on filters
    if (
      context &&
      !pathFilter({
        filePath,
        yamlParse,
        ...context,
      })
    ) {
      stream.resume();
      next();
      return;
    }

    const content = await streamToString(stream);
    if (content) {
      // Apply maxFileSize filter if specified
      if (context?.maxFileSize && content.size > context.maxFileSize) {
        stream.resume();
        next();
        return;
      }

      fileContents[filePath] = content;
    }

    next();
    stream.resume();
  });

  // Wait until the stream is finished
  await new Promise((resolve, reject) => {
    parser.on("finish", resolve);
    parser.on("error", reject);
  });

  // Apply .genignore filter if present
  const genignore =
    genignoreString && !context?.disableGenignore
      ? compile(genignoreString)
      : undefined;

  const unignoredFilePaths = Object.keys(fileContents).filter((p) =>
    genignore ? genignore.accepts(p.slice(1)) : true,
  );

  const final: { [path: string]: HashedEntry } = {};
  unignoredFilePaths.forEach((p) => {
    final[p] = fileContents[p];
  });

  return { status: 200, result: final };
};
