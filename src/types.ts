import { SwcFileParse } from "../swc/types.js";

// src/streamers/types.ts
export interface StreamHandlerOptions {
  shouldOmitFiles: boolean;
  shouldOmitTree: boolean;
  disableGenignore: boolean;
  plugins: string[];
  searchRegex: RegExp | undefined;
}

export interface FileEntry {
  type: "binary" | "content";
  content?: string;
  binary?: ArrayBuffer;
  url?: string;
  size: number;
  hash: string;
  updatedAt: number;
  // plugins
  /** data file content parsed as json (json, toml, yaml files) */
  json?: any;
  /**imported names */
  imports?: null | { [path: string]: string[] };
  exportDefault?: string[];
  mainComment?: string;
  /**swc-parse */
  parse?: null | SwcFileParse;
  /**swc parse for code-files, parsed to statements and imports */
  data?: null | {
    imports?: any[];
    statements?: any[];
  };
  matches?: RegExpExecArray[];
}

export type BallOptions = {
  response: Response;
  /** For github, npmjs, and jsr, this is needed. For other zips this may not be the case */
  omitFirstSegment: boolean;
  /** Prefix to use for a raw url */
  rawUrlPrefix: string;
  /** If true, will not cache */
  immutable: boolean;

  /** Parse will stop including files after this # of tokens */
  maxTokens?: number;

  /** If set to 'true' the response will not include the files */
  omitFiles?: boolean;
} & PathFilterOptions &
  ContentFilterOptions;

export type ContentFilterOptions = {
  /** Maximum file size to include (in bytes) */
  maxFileSize?: number;
  /** A text/pattern to search for in the file content */
  search?: string;
  /** Boolean to interpret search as a regular expression */
  searchUseRegex?: boolean;
  /** Boolean to enable/disable case sensitivity */
  searchCaseSensitive?: boolean;
  /** Boolean to match complete words only */
  searchMatchWholeWord?: boolean;
};
/** Filters on file path and file content/metadata */
export type PathFilterOptions = {
  /** Base path(s) allowed */
  allowedPaths?: string[];
  /** `.genignore` works like `.gitignore` and the repo owner can place this file in the repo to automatically filter out these files. To disable this and also to disable the default genignore, you can set this to true */
  disableGenignore?: boolean;
  /** glob pattern for files to include. If provided, will filter path on this. */
  pathPatterns?: string;
  /** glob pattern for files to exclude */
  excludePathPatterns?: string;
  /** Boolean to enable fuzzy matching for `pathPatterns` (like VS Code's Cmd+P) */
  enableFuzzyMatching?: boolean;

  // deprecated filters below. superseeded by path patterns
  /** @deprecated - Comma-separated list of filenames to match (case-insensitive) */
  matchFilenames?: string[];
  /** @deprecated */
  includeExt?: string[];
  /** @deprecated */
  excludeExt?: string[];
  /** @deprecated */
  includeDir?: string[];
  /** @deprecated */
  excludeDir?: string[];
  /** @deprecated */
  yamlString?: string;
};
