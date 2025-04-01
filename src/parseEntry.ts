import * as YAML from "js-yaml";
import TOML from "smol-toml";
import { FileEntry } from "./types.js";

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
      return YAML.load(content);
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

export const parseEntry = (
  path: string,
  entry: FileEntry,
  plugins: string[],
  searchRegex: RegExp | undefined,
): FileEntry => {
  if (entry.type === "content" && typeof entry.content === "string") {
    const extension = path.split(".").pop()?.toLowerCase() || "";

    const lines = entry.content.split("\n");
    const firstLineStartComment = lines[0].trim().startsWith("/*");
    const mainCommentEndIndex = firstLineStartComment
      ? lines.findIndex((line) => line.includes("*/"))
      : undefined;
    const mainCommentRaw =
      mainCommentEndIndex === undefined
        ? undefined
        : lines.slice(0, mainCommentEndIndex + 1).join("\n");
    const mainComment = mainCommentRaw
      ? mainCommentRaw.startsWith("/**")
        ? mainCommentRaw.slice(3, mainCommentRaw.length - 2).trim()
        : mainCommentRaw.slice(2, mainCommentRaw.length - 2).trim()
      : undefined;

    if (searchRegex) {
      //reset lastIndex since we already done this
      searchRegex.lastIndex = 0;
    }
    const matches = searchRegex
      ? Array.from(entry.content.matchAll(searchRegex))
      : undefined;

    return {
      ...entry,
      // ...code,
      matches,
      mainComment: plugins.includes("imports") ? mainComment : undefined,
      json: parseContentToJson(extension, entry.content),
    };
  }

  if (entry.type === "binary" && entry.binary) {
    const { binary, ...withoutBinary } = entry;
    return withoutBinary;
  }

  return entry;
};
