import { Transform } from "node:stream";
//@ts-ignore
import JSZip from "jszip";
import { FileEntry } from "./types.js";

export class ZipStreamer extends Transform {
  private zip: JSZip;
  private buffer: Array<{ path: string; entry: FileEntry }>;

  constructor() {
    super({
      objectMode: true,
    });
    this.zip = new JSZip();
    this.buffer = [];
  }

  _transform(
    chunk: { path: string; entry: FileEntry },
    encoding: string,
    callback: Function,
  ) {
    try {
      this.buffer.push(chunk);
      callback();
    } catch (error) {
      callback(error);
    }
  }

  _flush(callback: Function) {
    try {
      // Process all buffered chunks
      for (const chunk of this.buffer) {
        const { path, entry } = chunk;

        if (entry.type === "content" && entry.content) {
          // Handle text content
          this.zip.file(path, entry.content, {
            binary: false,
            createFolders: true,
            compression: "DEFLATE",
          });
        } else if (entry.type === "binary" && entry.binary) {
          // Handle binary content - crucial for images and other binary files
          // Ensure binary is treated as a Buffer or Uint8Array
          const binaryData = Buffer.isBuffer(entry.binary)
            ? entry.binary
            : Buffer.from(entry.binary);

          this.zip.file(path, binaryData, {
            binary: true,
            createFolders: true,
            compression: "DEFLATE",
          });
        }
      }

      // Generate ZIP with proper streaming options
      this.zip
        .generateNodeStream({
          type: "nodebuffer",
          streamFiles: true,
          compression: "DEFLATE",

          compressionOptions: {
            level: 6, // Balanced compression level
          },
        })
        .on("data", (chunk: Buffer) => {
          this.push(chunk);
        })
        .on("end", () => {
          callback();
        })
        .on("error", (error: Error) => {
          callback(error);
        });
    } catch (error) {
      callback(error);
    }
  }
}
