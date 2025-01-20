import { Transform } from "node:stream";
import { FileEntry, StreamHandlerOptions } from "./types.js";
import * as YAML from "yaml";
import TOML from "smol-toml";

type NestedObject<T = null> = {
  [key: string]: NestedObject<T> | T;
};

const CHARACTERS_PER_TOKEN = 5;
const RS = Buffer.from([0x1e]); // Record Separator
const LF = Buffer.from([0x0a]); // Line Feed

function filePathToNestedObject<T, U>(
  flatObject: { [filepath: string]: T },
  mapper: (value: T) => U,
): NestedObject<U> {
  const result: NestedObject<U> = {};

  for (const [path, value] of Object.entries(flatObject)) {
    let parts = path.split("/");
    parts = parts[0] === "" ? parts.slice(1) : parts;

    let current: NestedObject<U> = result;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        current[part] = mapper(value);
      } else {
        current[part] = (current[part] as NestedObject<U>) || {};
        current = current[part] as NestedObject<U>;
      }
    }
  }

  return result;
}

interface SizeStats {
  totalFiles: number;
  files: number;
  totalTokens: number;
  tokens: number;
  characters: number;
  lines: number;
}

export class JSONSequenceStreamer extends Transform {
  private files: { [path: string]: FileEntry } = {};
  private fileCount = 0;
  private totalCharacters = 0;
  private totalLines = 0;

  constructor(private options: StreamHandlerOptions) {
    super({ objectMode: true });
  }

  private calculateSizeStats(): SizeStats {
    return {
      totalFiles: this.fileCount,
      files: this.fileCount,
      totalTokens: Math.ceil(this.totalCharacters / CHARACTERS_PER_TOKEN),
      tokens: Math.ceil(this.totalCharacters / CHARACTERS_PER_TOKEN),
      characters: this.totalCharacters,
      lines: this.totalLines,
    };
  }

  private parseContent(path: string, entry: FileEntry): FileEntry {
    if (entry.type === "content" && typeof entry.content === "string") {
      const extension = path.split(".").pop()?.toLowerCase();

      try {
        if (extension === "json") {
          try {
            return {
              ...entry,
              json: JSON.parse(entry.content),
            };
          } catch (e) {
            return { ...entry, json: null };
          }
        }

        if (extension === "yaml" || extension === "yml") {
          try {
            return {
              ...entry,
              json: YAML.parse(entry.content),
            };
          } catch (e) {
            return { ...entry, json: null };
          }
        }

        if (extension === "toml") {
          try {
            return {
              ...entry,
              json: TOML.parse(entry.content),
            };
          } catch (e) {
            return { ...entry, json: null };
          }
        }
      } catch (error) {
        console.warn(
          `Failed to parse ${extension} content for ${path}:`,
          error,
        );
      }
    }

    if (entry.type === "binary" && entry.binary) {
      // remove binary
      const { binary, ...withoutBinary } = entry;
      return withoutBinary;
    }

    return entry;
  }

  private writeJSONSequence(data: any) {
    // Escape any RS characters in the JSON string
    const jsonString = JSON.stringify(data).replace(/\x1E/g, "\\u001E");

    // Write RS + JSON + LF sequence
    this.push(Buffer.concat([RS, Buffer.from(jsonString), LF]));
  }

  _transform(
    chunk: { path: string; entry: FileEntry },
    encoding: string,
    callback: Function,
  ) {
    try {
      // Parse the content if applicable
      const parsedEntry = this.parseContent(chunk.path, chunk.entry);

      // Store the file entry and update counts
      this.files[chunk.path] = parsedEntry;
      this.fileCount++;

      if (parsedEntry.type === "content" && parsedEntry.content) {
        this.totalCharacters += parsedEntry.content.length;
        this.totalLines += parsedEntry.content.split("\n").length;
      }

      if (!this.options.shouldOmitFiles) {
        // Write the file entry as a JSON Text Sequence record
        this.writeJSONSequence({
          type: "file",
          path: chunk.path,
          entry: parsedEntry,
        });
      }

      callback();
    } catch (error) {
      callback(error);
    }
  }

  _flush(callback: Function) {
    try {
      // Add tree if not omitted
      if (!this.options.shouldOmitTree) {
        const tree = filePathToNestedObject(this.files, () => null);
        this.writeJSONSequence({
          type: "tree",
          tree,
        });
      }

      // Add size stats at the end
      const sizeStats = this.calculateSizeStats();
      this.writeJSONSequence({
        type: "size",
        size: sizeStats,
      });

      callback();
    } catch (error) {
      callback(error);
    }
  }
}
