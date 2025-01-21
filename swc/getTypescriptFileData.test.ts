import { readFileSync } from "fs";
import { getTypescriptFileData } from "./getTypescriptFileData.js";
import { trySwcParseFile } from "./trySwcParseFile.js";

const test = async () => {
  const path =
    "/Users/admin/Desktop/p0/swcapi/api/helpers/getTypescriptFileData.ts";
  const src = readFileSync(path, "utf8");
  const parse = trySwcParseFile(path, src, {
    syntax: "typescript",
    comments: true,
    script: true,
    tsx: true,
    decorators: true,
  });

  if (!parse.result) {
    return;
  }

  const data = await getTypescriptFileData(path, parse.result);

  console.dir(data);
};

test();
