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
      this.zip.file(chunk.path, chunk.entry.content, {
        binary: false,
        // date: new Date(chunk.entry.updatedAt),
        createFolders: true,
      });
    } else if (chunk.entry.type === "binary" && chunk.entry.binary) {
      // this.zip.file(chunk.path, chunk.entry.binary, {
      //   binary: true,
      //   date: new Date(chunk.entry.updatedAt),
      //   createFolders: true,
      // });
    } else if (chunk.entry.type === "binary" && chunk.entry.url) {
      // Do nothing for now. We should later fetch these binary URLs to get the actual content
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
