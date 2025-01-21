import * as YAML from "yaml";
import TOML from "smol-toml";
import { FileEntry } from "./types.js";
import { trySwcParseFile } from "../swc/trySwcParseFile.js";
import { getTypescriptFileData } from "../swc/getTypescriptFileData.js";

const parseContentToJson = (
  extension: string,
  content: string,
): {} | null | undefined => {
  if (extension === "json") {
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  if (extension === "yaml" || extension === "yml") {
    try {
      return YAML.parse(content);
    } catch {
      return null;
    }
  }

  if (extension === "toml") {
    try {
      return TOML.parse(content);
    } catch {
      return null;
    }
  }
};

const parseCode = (
  path: string,
  content: string,
  config: { imports: boolean; parse: boolean; data: boolean },
) => {
  if (!config.imports && !config.parse && !config.data) {
    return {};
  }
  const isJavascript =
    path.endsWith(".js") ||
    path.endsWith(".jsx") ||
    path.endsWith(".mjs") ||
    path.endsWith(".cjs");

  const isTypescript =
    path.endsWith(".ts") ||
    path.endsWith(".tsx") ||
    path.endsWith(".mts") ||
    path.endsWith(".cts");

  if (!isJavascript && !isTypescript) {
    console.log("Skipping", path);
    return;
  }

  const parse = trySwcParseFile(path, content, {
    syntax: isJavascript ? "ecmascript" : "typescript",
    comments: true,
    script: true,
    tsx: true,
    decorators: true,
  });

  if (!parse.result) {
    console.log("Failed parsing:", path);
    return {
      imports: config.imports ? null : undefined,
      parse: config.parse ? null : undefined,
      data: config.data ? null : undefined,
      parseError: "Failed parsing: " + parse.message,
    };
  }

  if (!config.imports && !config.data) {
    console.log("only parse");
    return { parse: parse.result };
  }

  const data = getTypescriptFileData(path, parse.result);

  if (!data.isSuccessful) {
    return {
      parse: config.parse ? parse.result : undefined,
      data: config.data ? null : undefined,
      dataError: "Failed getting data: " + data.message,
    };
  }

  if (!config.imports) {
    return {
      parse: config.parse ? parse.result : undefined,
      data: config.data ? data : undefined,
    };
  }

  const imports: { [path: string]: string[] } = {};

  data?.imports?.map((imp: { module: string; name: string }) => {
    const { module } = imp;
    if (!imports[module]) {
      imports[module] = [];
    }
    imports[module].push(imp.name);
  });

  return {
    parse: config.parse ? parse.result : undefined,
    data: config.data ? data : undefined,
    imports: imports,
  };
};
export const parseJsonFileEntry = (
  path: string,
  entry: FileEntry,
  plugins: string[],
): FileEntry => {
  if (entry.type === "content" && typeof entry.content === "string") {
    const extension = path.split(".").pop()?.toLowerCase() || "";

    const code = parseCode(path, entry.content, {
      imports: plugins.includes("imports"),
      parse: plugins.includes("parse"),
      data: plugins.includes("data"),
    });
    return {
      ...entry,
      ...code,
      json: parseContentToJson(extension, entry.content),
    };
  }

  if (entry.type === "binary" && entry.binary) {
    const { binary, ...withoutBinary } = entry;
    return withoutBinary;
  }

  return entry;
};
