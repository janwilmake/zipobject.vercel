import { PassThrough } from "node:stream";
import * as YAML from "yaml";
import { shouldIncludeFile } from "./shouldIncludeFile.js";
import { TokenCounter } from "./TokenCounter.js";
import { BallOptions, FileEntry } from "./types.js";

interface JsonFileEntry {
  type: "content" | "binary";
  content?: string;
  url?: string;
  size: number;
  hash: string;
  updatedAt: number;
  [key: string]: any;
}

interface JsonFilesObject {
  files: {
    [path: string]: JsonFileEntry;
  };
}

const jsonToFileObject = (json: any) => {
  return {
    files: Object.fromEntries(
      Object.keys(json).map((key) => {
        const value = json[key];
        const content = JSON.stringify(value, undefined, 2);
        const newKey = key.endsWith(".json") ? key : key + ".json";

        try {
          if (value?.$ref) {
            new URL(value.$ref);
            const fileEntry = {
              type: "binary",
              hash: "",
              updatedAt: Date.now(),
              url: value.$ref,
            };
            return [newKey, fileEntry];
          } else {
            throw new Error("No ref");
          }
        } catch (e) {
          const fileEntry = {
            type: "content",
            size: content.length,
            hash: "",
            updatedAt: Date.now(),
            content,
          };
          return [newKey, fileEntry];
        }
      }),
    ),
  } satisfies JsonFilesObject;
};
export const createJsonStream = async (options: BallOptions) => {
  const {
    response,
    disableGenignore,
    yamlFilter,
    maxTokens,
    rawUrlPrefix,
    omitFirstSegment,
    matchFilenames,
    includeExt,
    excludeExt,
    includeDir,
    excludeDir,
    allowedPaths,
    maxFileSize,
  } = options;

  // Initialize token counter
  const tokenCounter = new TokenCounter(maxTokens);

  // Parse YAML filter if provided
  let yamlParse: any;
  if (yamlFilter) {
    try {
      yamlParse = YAML.parse(yamlFilter);
    } catch (e: any) {
      throw new Error(`Invalid YAML filter: ${e.message}`);
    }
  }

  const outputStream = new PassThrough({ objectMode: true });

  try {
    // Parse JSON response
    const jsonData = await response.json();

    const isFilesObject =
      "files" in jsonData &&
      typeof jsonData.files === "object" &&
      !Array.isArray(jsonData.files);
    // Transform JSON data into files object if needed
    const filesObject: JsonFilesObject = isFilesObject
      ? jsonData
      : jsonToFileObject(jsonData);
    // Process each file entry
    for (const [path, entry] of Object.entries(filesObject.files)) {
      const filePath = omitFirstSegment
        ? "/" + path.split("/").slice(1).join("/")
        : "/" + path;

      // Check if file should be included based on filters
      if (
        !shouldIncludeFile({
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
        continue;
      }

      // Apply maxFileSize filter if specified
      if (maxFileSize && entry.size > maxFileSize) {
        continue;
      }

      // Check token limit before processing
      if (
        entry.type === "content" &&
        entry.content &&
        !tokenCounter.canAddFile(entry.content)
      ) {
        continue;
      }

      // Update token count for content files
      if (entry.type === "content" && entry.content) {
        tokenCounter.addFile(entry.content);
      }

      // Ensure entry has required fields
      const processedEntry: FileEntry = {
        type: entry.type,
        content: entry.content,
        url:
          entry.url ||
          (entry.type === "binary" ? `${rawUrlPrefix}${filePath}` : undefined),
        size: entry.size,
        hash: entry.hash,
        updatedAt: entry.updatedAt || Date.now(),
      };

      // Write to output stream
      outputStream.write({ path: filePath, entry: processedEntry });
    }

    // End the stream
    outputStream.end();
  } catch (error) {
    outputStream.destroy(error as Error);
  }

  return outputStream;
};
