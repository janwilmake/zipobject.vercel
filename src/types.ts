// src/streamers/types.ts
export interface StreamHandlerOptions {
  shouldOmitFiles: boolean;
  shouldOmitTree: boolean;
  disableGenignore: boolean;
}

export interface FileEntry {
  type: "binary" | "content";
  content?: string;
  binary?: ArrayBuffer;
  url?: string;
  size: number;
  hash: string;
  json?: any;
  updatedAt: number;
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
