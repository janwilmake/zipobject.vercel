// src/streamers/ZipStreamer.ts
import { Transform } from "node:stream";
//@ts-ignore
import JSZip from "jszip";
import { FileEntry } from "./types.js";

export class ZipStreamer extends Transform {
  private zip: JSZip;

  constructor() {
    super({ objectMode: true });
    this.zip = new JSZip();
  }

  _transform(
    chunk: { path: string; entry: FileEntry },
    encoding: string,
    callback: Function,
  ) {
    if (chunk.entry.type === "content" && chunk.entry.content) {
      this.zip.file(chunk.path, chunk.entry.content);
    } else if (chunk.entry.type === "binary" && chunk.entry.url) {
      // For binary files, we could either:
      // 1. Skip them
      // 2. Fetch them if URL is available
      // 3. Include them as empty/placeholder files
      // For now, we'll skip them
    }
    callback();
  }

  _flush(callback: Function) {
    this.zip
      .generateNodeStream({
        type: "nodebuffer",
        streamFiles: true,
        compression: "DEFLATE",
      })
      .pipe(this);
    callback();
  }
}
