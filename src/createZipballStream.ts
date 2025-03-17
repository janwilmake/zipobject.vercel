import { Parse } from "unzipper";
import { PassThrough, Readable, Transform } from "node:stream";
import * as YAML from "yaml";
import { compile } from "./ignore.js";
import { FileProcessor } from "./FileProcessor.js";
import { BallOptions, ContentFilterOptions, FileEntry } from "./types.js";
import { TokenCounter } from "./TokenCounter.js";
import { pathFilter } from "./pathFilter.js";
import { createSearchRegex } from "./createSearchRegex.js";

export const createZipballStream = async (options: BallOptions) => {
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

  const readableStream = response.body;
  // Initialize token counter
  const tokenCounter = new TokenCounter(maxTokens);

  // Parse YAML filter if provided
  let yamlParse: any;
  if (yamlString) {
    try {
      yamlParse = YAML.parse(yamlString);
    } catch (e: any) {
      throw new Error(`Invalid YAML filter: ${e.message}`);
    }
  }

  const outputStream = new PassThrough({ objectMode: true });
  const cacheStream = new PassThrough({ objectMode: true });
  const nodeStream = new PassThrough();
  Readable.fromWeb(readableStream as any).pipe(nodeStream);

  let genignoreString: string | null = null;
  const unzipStream = nodeStream.pipe(Parse());

  unzipStream.on("entry", async (entry) => {
    const filePath =
      "/" +
      (omitFirstSegment
        ? entry.path.split("/").slice(1).join("/")
        : entry.path);

    const type = entry.type;

    if (type !== "File") {
      entry.autodrain();
      return;
    }

    // Handle .genignore file
    if (filePath === "/.genignore" && !disableGenignore) {
      const chunks: Buffer[] = [];
      entry.on("data", (chunk: Buffer) => chunks.push(chunk));
      entry.on("end", () => {
        genignoreString = Buffer.concat(chunks).toString("utf8");
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
      entry.autodrain();
      return;
    }

    const updatedAt = new Date(entry.vars.lastModifiedDateTime).valueOf();
    // not diffrerent, seems invalid: const { lastModifiedDate, lastModifiedTime } = entry.vars;
    // Process the file
    const processor = new FileProcessor(filePath, rawUrlPrefix, updatedAt);

    processor.on("data", (data: { entry: FileEntry }) => {
      if (
        filterOptions.maxFileSize &&
        data.entry.size > filterOptions.maxFileSize
      ) {
        // Too big
        entry.autodrain();
        return;
      }

      if (searchRegex) {
        if (data.entry.type === "binary") {
          // binary never matches
          entry.autodrain();
          return;
        }

        if (data.entry.type === "content" && data.entry.content) {
          if (!searchRegex.test(data.entry.content)) {
            // no match to search
            entry.autodrain();

            return;
          }
        }
      }

      // Check token limit before processing
      if (
        data.entry.type === "content" &&
        !tokenCounter.canAddFile(data.entry.content)
      ) {
        entry.autodrain();
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
      // Optional: Log token usage for debugging
      // console.log(
      //   `createZipballStream: Current token count: ${tokenCounter.getCurrentTokens()}`,
      // );
    });

    processor.on("error", (err) => {
      console.error("Processor error:", err);
      entry.autodrain();
    });

    entry.pipe(processor);
  });

  // Similar updates for createTarballStream
  unzipStream.on("end", () => {
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
      });
      outputStream.pipe(filteredStream);
      cacheStream.pipe(filteredStream);
    }
    outputStream.end();
    cacheStream.end();
  });

  unzipStream.on("error", (err) => {
    outputStream.destroy(err);
    cacheStream.destroy(err);
  });

  return { outputStream, cacheStream, searchRegex };
};
