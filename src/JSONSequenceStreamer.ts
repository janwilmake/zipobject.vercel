import { Transform } from "node:stream";
import { FileEntry, StreamHandlerOptions } from "./types.js";
import { parseEntry } from "./parseEntry.js";

type NestedObject<T = null> = {
  [key: string]: NestedObject<T> | T;
};

const CHARACTERS_PER_TOKEN = 5;
const RS = Buffer.from([0x1e]); // Record Separator
const LF = Buffer.from([0x0a]); // Line Feed

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

export class JSONSequenceStreamer extends Transform {
  //private files: { [path: string]: FileEntry } = {};
  private paths: string[] = [];
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

  private writeJSONSequence(data: any) {
    // Escape any RS characters in the JSON string
    const jsonString = JSON.stringify(data).replace(/\x1E/g, "\\u001E");

    // Write RS + JSON + LF sequence
    this.push(Buffer.concat([RS, Buffer.from(jsonString), LF]));
  }

  _transform(
    chunk: { path: string; paths: string[]; entry: FileEntry },
    encoding: string,
    callback: Function,
  ) {
    try {
      // Parse the content if applicable
      const parsedEntry = parseEntry(
        chunk.path,
        chunk.entry,
        this.options.plugins,
        this.options.searchRegex,
      );

      // Store the file entry and update counts
      this.paths.push(chunk.path);
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
        const tree = filePathToNestedObject(this.paths);
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
