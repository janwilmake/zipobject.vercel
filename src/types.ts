import { SwcFileParse } from "../swc/types.js";

// src/streamers/types.ts
export interface StreamHandlerOptions {
  shouldOmitFiles: boolean;
  shouldOmitTree: boolean;
  disableGenignore: boolean;
  plugins: string[];
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
}

export type BallOptions = {
  response: Response;
  /** For github, npmjs, and jsr, this is needed. For other zips this may not be the case */
  omitFirstSegment: boolean;
  rawUrlPrefix: string;
  immutable: boolean;
  matchFilenames?: string[];
  includeExt?: string[];
  excludeExt?: string[];
  yamlFilter?: string;
  allowedPaths?: string[];
  includeDir?: string[];
  excludeDir?: string[];
  disableGenignore?: boolean;
  maxFileSize?: number;
  maxTokens?: number;
  shouldOmitFiles?: boolean;
};
