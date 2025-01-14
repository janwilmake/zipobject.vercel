import { Transform } from "node:stream";
import { FileEntry, StreamHandlerOptions } from "./types.js";
import * as YAML from "yaml";
import TOML from "smol-toml";

type NestedObject<T = null> = {
  [key: string]: NestedObject<T> | T;
};

const CHARACTERS_PER_TOKEN = 5;
const INDENT = "  ";

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

export class JSONStreamer extends Transform {
  private firstChunk = true;
  private filesStarted = false;
  private files: { [path: string]: FileEntry } = {};
  private fileCount = 0;
  private totalCharacters = 0;
  private totalLines = 0;

  constructor(private options: StreamHandlerOptions) {
    super({ objectMode: true });
    this.push("{\n");
  }

  private calculateSizeStats(): SizeStats {
    const stats: SizeStats = {
      totalFiles: this.fileCount,
      files: this.fileCount,
      totalTokens: Math.ceil(this.totalCharacters / CHARACTERS_PER_TOKEN),
      tokens: Math.ceil(this.totalCharacters / CHARACTERS_PER_TOKEN),
      characters: this.totalCharacters,
      lines: this.totalLines,
    };
    return stats;
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
        // If parsing fails, return the original entry without modification
        console.warn(
          `Failed to parse ${extension} content for ${path}:`,
          error,
        );
      }
    }

    return entry;
  }

  _transform(
    chunk: { path: string; entry: FileEntry },
    encoding: string,
    callback: Function,
  ) {
    // Parse the content if applicable
    const parsedEntry = this.parseContent(chunk.path, chunk.entry);

    // Store the file entry and update counts
    this.files[chunk.path] = parsedEntry;
    this.fileCount++;

    if (parsedEntry.type === "content" && parsedEntry.content) {
      this.totalCharacters += parsedEntry.content.length;
      this.totalLines += parsedEntry.content.split("\n").length;
    }

    let output = "";

    if (this.firstChunk) {
      output += `${INDENT}"files": {\n`;
      this.firstChunk = false;
      this.filesStarted = true;
    } else if (this.filesStarted) {
      output += ",\n";
    }

    // Pretty print the entry JSON with proper indentation
    const entryJson = JSON.stringify(parsedEntry, null, 2)
      .split("\n")
      .map((line, index) => (index === 0 ? line : INDENT + INDENT + line))
      .join("\n");

    output += `${INDENT}${INDENT}"${chunk.path}": ${entryJson}`;
    this.push(output);
    callback();
  }

  _flush(callback: Function) {
    let output = `\n${INDENT}}`; // Close files object

    // Add tree if not omitted
    if (!this.options.shouldOmitTree) {
      const treeJson = JSON.stringify(
        filePathToNestedObject(this.files, () => null),
        null,
        2,
      )
        .split("\n")
        .map((line, index) => (index === 0 ? line : INDENT + line))
        .join("\n");

      output += `,\n${INDENT}"tree": ${treeJson}`;
    }

    // Add size stats at the end
    const sizeStats = this.calculateSizeStats();
    const statsJson = JSON.stringify(sizeStats, null, 2)
      .split("\n")
      .map((line, index) => (index === 0 ? line : INDENT + line))
      .join("\n");

    output += `,\n${INDENT}"size": ${statsJson}`;

    output += "\n}"; // Close root object
    this.push(output);
    callback();
  }
}
