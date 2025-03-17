import { Transform } from "node:stream";
import { FileEntry, StreamHandlerOptions } from "./types.js";
import * as YAML from "yaml";
import TOML from "smol-toml";
import { parseEntry } from "./parseEntry.js";

type NestedObject<T = null> = {
  [key: string]: NestedObject<T> | T;
};

const CHARACTERS_PER_TOKEN = 5;
const INDENT = "  ";

function filePathToNestedObject(paths: string[]): NestedObject<null> {
  const result: NestedObject<null> = {};

  for (const path of paths) {
    let parts = path.split("/");
    parts = parts[0] === "" ? parts.slice(1) : parts;

    let current: NestedObject<null> = result;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        current[part] = null;
      } else {
        current[part] = (current[part] as NestedObject<null>) || {};
        current = current[part] as NestedObject<null>;
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
  // private files: { [path: string]: FileEntry } = {};
  private paths: string[] = [];
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

  async _transform(
    chunk: { path: string; entry: FileEntry },
    encoding: string,
    callback: Function,
  ) {
    // Parse the content if applicable
    const parsedEntry = parseEntry(
      chunk.path,
      chunk.entry,
      this.options.plugins,
      this.options.searchRegex,
    );

    // Store the file entry and update counts
    // this.files[chunk.path] = parsedEntry;
    this.paths.push(chunk.path);
    this.fileCount++;

    if (parsedEntry.type === "content" && parsedEntry.content) {
      this.totalCharacters += parsedEntry.content.length;
      this.totalLines += parsedEntry.content.split("\n").length;
    }

    // Pretty print the entry JSON with proper indentation

    if (!this.options.shouldOmitFiles) {
      let output = "";

      if (this.firstChunk) {
        output += `${INDENT}"files": {\n`;
        this.firstChunk = false;
        this.filesStarted = true;
      } else if (this.filesStarted) {
        output += ",\n";
      }
      const entryJson = JSON.stringify(parsedEntry, null, 2)
        .split("\n")
        .map((line, index) => (index === 0 ? line : INDENT + INDENT + line))
        .join("\n");
      output += `${INDENT}${INDENT}"${chunk.path}": ${entryJson}`;
      this.push(output);
    }
    callback();
  }

  _flush(callback: Function) {
    let output = !this.options.shouldOmitFiles ? `\n${INDENT}}` : ""; // Close files object

    // Add tree if not omitted
    if (!this.options.shouldOmitTree) {
      const treeJson = JSON.stringify(
        filePathToNestedObject(this.paths),
        null,
        2,
      )
        .split("\n")
        .map((line, index) => (index === 0 ? line : INDENT + line))
        .join("\n");

      const comma = this.options.shouldOmitFiles ? "" : `,\n`;

      output += `${comma}${INDENT}"tree": ${treeJson}`;
    }

    // Add size stats at the end
    const sizeStats = this.calculateSizeStats();
    const statsJson = JSON.stringify(sizeStats, null, 2)
      .split("\n")
      .map((line, index) => (index === 0 ? line : INDENT + line))
      .join("\n");
    const { shouldOmitFiles, shouldOmitTree } = this.options;
    const comma = shouldOmitFiles && shouldOmitTree ? "" : `,\n`;
    output += `${comma}${INDENT}"size": ${statsJson}`;

    output += "\n}"; // Close root object
    this.push(output);
    callback();
  }
}
