import { Transform } from "node:stream";
import { FileEntry, StreamHandlerOptions } from "./types.js";
import YAML from "js-yaml";
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

export class YAMLStreamer extends Transform {
  private firstChunk = true;
  private filesStarted = false;
  private paths: string[] = [];
  private fileCount = 0;
  private totalCharacters = 0;
  private totalLines = 0;
  private yamlParts: string[] = [];

  constructor(private options: StreamHandlerOptions) {
    super({ objectMode: true });
    // Start the YAML document
    this.push("---\n");
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

  private indentYAML(yamlString: string, level: number): string {
    const indent = INDENT.repeat(level);
    return yamlString
      .split("\n")
      .map((line) => (line.trim() ? indent + line : line))
      .join("\n");
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

    // Store the path and update counts
    this.paths.push(chunk.path);
    this.fileCount++;

    if (parsedEntry.type === "content" && parsedEntry.content) {
      this.totalCharacters += parsedEntry.content.length;
      this.totalLines += parsedEntry.content.split("\n").length;
    }

    // Add files section if not omitted
    if (!this.options.shouldOmitFiles) {
      if (this.firstChunk) {
        this.push("files:\n");
        this.firstChunk = false;
        this.filesStarted = true;
      }

      // Convert the entry to YAML and properly indent it
      const entryYaml = YAML.dump({ [chunk.path]: parsedEntry });
      const indentedYaml = this.indentYAML(entryYaml, 1)
        .split("\n")
        .slice(1) // Remove the first line (key is handled differently)
        .join("\n");

      this.push(`  ${chunk.path}:${indentedYaml}`);
    }
    callback();
  }

  _flush(callback: Function) {
    let output = "";

    // Add tree if not omitted
    if (!this.options.shouldOmitTree) {
      const treeObj = filePathToNestedObject(this.paths);
      const treeYaml = YAML.dump({ tree: treeObj });
      output += "\n" + treeYaml;
    }

    // Add size stats at the end
    const sizeStats = this.calculateSizeStats();
    const statsYaml = YAML.dump({ size: sizeStats });
    output += "\n" + statsYaml;

    this.push(output);
    callback();
  }
}
