import { extract } from "tar-stream";
import { PassThrough, Readable, Transform } from "node:stream";
import { createGunzip } from "zlib";
import { compile } from "./ignore.js";
import * as YAML from "js-yaml";
import { FileProcessor } from "./FileProcessor.js";
import { BallOptions, FileEntry } from "./types.js";
import { TokenCounter } from "./TokenCounter.js";
import { pathFilter } from "./pathFilter.js";
import { createSearchRegex } from "./createSearchRegex.js";

// Updated createTarballStream.ts
export const createTarballStream = async (options: BallOptions) => {
  const {
    response,
    disableGenignore,
    yamlString,
    maxTokens,
    rawUrlPrefix,
    omitFirstSegment,
    ...filterOptions
  } = options;

  const searchRegex = filterOptions.search
    ? createSearchRegex(filterOptions)
    : undefined;

  // Initialize token counter
  const tokenCounter = new TokenCounter(maxTokens);

  // Parse YAML filter if provided
  let yamlParse: any;
  if (yamlString) {
    try {
      yamlParse = YAML.load(yamlString);
    } catch (e: any) {
      throw new Error(`Invalid YAML filter: ${e.message}`);
    }
  }

  const outputStream = new PassThrough({ objectMode: true });
  const cacheStream = new PassThrough({ objectMode: true });
  const nodeStream = new PassThrough();
  Readable.fromWeb(response.body as any).pipe(nodeStream);

  let genignoreString: string | null = null;
  const parser = extract();

  nodeStream.pipe(createGunzip()).pipe(parser);

  parser.on("entry", async (header: any, stream: any, next: any) => {
    try {
      const filePath =
        "/" +
        (omitFirstSegment
          ? header.name.split("/").slice(1).join("/")
          : header.name);

      const type = header.type;

      if (type !== "file") {
        stream.resume();
        next();
        return;
      }

      // Handle .genignore file
      if (filePath === "/.genignore" && !disableGenignore) {
        const chunks: Buffer[] = [];
        stream.on("data", (chunk: Buffer) => chunks.push(chunk));
        stream.on("end", () => {
          genignoreString = Buffer.concat(chunks).toString("utf8");
          next();
        });
        return;
      }

      // Check if file should be included
      if (
        !pathFilter({
          ...filterOptions,
          filePath,
          yamlParse,
        })
      ) {
        stream.resume();
        next();
        return;
      }

      // Process the file
      const processor = new FileProcessor(filePath, rawUrlPrefix, Date.now());

      processor.on("data", (data: { entry: FileEntry }) => {
        if (
          filterOptions.maxFileSize &&
          data.entry.size > filterOptions.maxFileSize
        ) {
          // Too big
          stream.resume();
          next();
          return;
        }

        if (searchRegex) {
          if (data.entry.type === "binary") {
            // binary never matches
            stream.resume();
            next();
            return;
          }
          if (data.entry.type === "content" && data.entry.content) {
            if (!searchRegex.test(data.entry.content)) {
              // no match to search
              stream.resume();
              next();

              return;
            }
          }
        }

        // Check token limit before processing
        if (
          data.entry.type === "content" &&
          !tokenCounter.canAddFile(data.entry.content)
        ) {
          stream.resume();
          next();
          return;
        }

        // Update token count and write data
        if (data.entry.type === "content") {
          tokenCounter.addFile(data.entry.content);
        }
        outputStream.write(data);
        cacheStream.write(data);
      });

      processor.on("end", () => {
        next();
      });

      processor.on("error", (err) => {
        console.error("Processor error:", err);
        next(err);
      });

      stream.pipe(processor);
    } catch (error) {
      next(error);
    }
  });

  parser.on("finish", () => {
    if (genignoreString && !disableGenignore) {
      const ignoreFilter = compile(genignoreString);
      const filteredStream = new Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
          if (ignoreFilter.accepts(chunk.path.slice(1))) {
            this.push(chunk);
          }
          callback();
        },
        flush(callback) {
          callback();
          outputStream.end();
          cacheStream.end();
        },
      });
      outputStream.pipe(filteredStream);
      cacheStream.pipe(filteredStream);
    } else {
      outputStream.end();
      cacheStream.end();
    }
  });

  parser.on("error", (err) => {
    outputStream.destroy(err);
  });

  return { outputStream, cacheStream, searchRegex };
};
