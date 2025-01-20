import { Transform } from "node:stream";
import { createHash } from "node:crypto";
import { FileEntry } from "./types.js";

export class FileProcessor extends Transform {
  private decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false });
  private chunks: Buffer[] = [];
  private size = 0;
  private hash = createHash("sha256");
  private isBinary = false;

  constructor(private path: string, private rawUrlPrefix: string) {
    super({
      objectMode: true, // Enable object mode
    });
  }

  _transform(chunk: Buffer, encoding: string, callback: Function) {
    this.size += chunk.length;
    this.hash.update(chunk);

    try {
      if (!this.isBinary) {
        this.decoder.decode(chunk, { stream: true });
        this.chunks.push(chunk);
      }
    } catch {
      this.isBinary = true;
      this.chunks = []; // Clear accumulated chunks
    }

    callback();
  }

  _flush(callback: Function) {
    const hash = this.hash.digest("hex");

    const entry: FileEntry = this.isBinary
      ? {
          type: "binary",
          url: this.rawUrlPrefix + this.path,
          hash,
          size: this.size,
        }
      : {
          type: "content",
          content: Buffer.concat(this.chunks).toString("utf8"),
          hash,
          size: this.size,
        };

    this.push({ path: this.path, entry });
    callback();
  }
}
