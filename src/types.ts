// src/streamers/types.ts
export interface StreamHandlerOptions {
  shouldOmitFiles: boolean;
  shouldOmitTree: boolean;
  disableGenignore: boolean;
}

export interface FileEntry {
  type: "binary" | "content";
  content?: string;
  url?: string;
  size: number;
  hash: string;
  json?: any;
}

export type BallOptions = {
  zipUrl: string;
  zipHeaders?: { [name: string]: string };
  immutable: boolean;
  matchFilenames?: string[];
  includeExt: string[];
  excludeExt: string[];
  yamlFilter?: string;
  allowedPaths?: string[];
  includeDir: string[];
  excludeDir: string[];
  disableGenignore?: boolean;
  maxFileSize?: number;
  maxTokens?: number;
};
