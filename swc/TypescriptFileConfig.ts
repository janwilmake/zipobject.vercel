import { ModuleItem } from "@swc/core";
export type TypescriptFileConfig = {
  /**
   * function to filter files based on their swc parse
   *
   * if this filter returns false, the file will not be further analysed
   */
  swcParseFilter?: (items: ModuleItem[]) => boolean;

  /**
   * function to filter files based on their raw code
   */
  rawFilter?: (rawCode: string) => boolean;
};
