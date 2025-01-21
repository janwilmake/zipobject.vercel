import { Transform } from "node:stream";
import { createHash } from "node:crypto";
import { FileEntry } from "./types.js";

export class FileProcessor extends Transform {
  private decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false });
  private chunks: Buffer[] = [];
  private size = 0;
  private hash = createHash("sha256");
  private isBinary = false;

  constructor(
    private path: string,
    private paths: string[],
    private rawUrlPrefix: string,
    private updatedAt: number,
  ) {
    super({
      objectMode: true, // Enable object mode
    });
  }

  _transform(chunk: Buffer, encoding: string, callback: Function) {
    this.size += chunk.length;
    this.hash.update(chunk);
    // always process the chunk
    this.chunks.push(chunk);

    try {
      if (!this.isBinary) {
        this.decoder.decode(chunk, { stream: true });
      }
    } catch {
      this.isBinary = true;
    }

    callback();
  }

  _flush(callback: Function) {
    const hash = this.hash.digest("hex");

    const updatedAt = this.updatedAt;
    const entry: FileEntry = this.isBinary
      ? {
          type: "binary",
          url: this.rawUrlPrefix + this.path,
          hash,
          size: this.size,
          // NB: it may make things less efficient if we have to do this for JSON while we only need the URL
          binary: Buffer.concat(this.chunks),
          updatedAt,
        }
      : {
          type: "content",
          content: Buffer.concat(this.chunks).toString("utf8"),
          hash,
          size: this.size,
          updatedAt,
        };

    this.push({ path: this.path, paths: this.paths, entry });
    callback();
  }
}
