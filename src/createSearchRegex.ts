import { ContentFilterOptions } from "./types.js";

export const createSearchRegex = ({
  search,
  searchCaseSensitive,
  searchMatchWholeWord,
  searchUseRegex,
}: ContentFilterOptions): RegExp => {
  // Return empty regex if no search string is provided
  if (!search) {
    return new RegExp("");
  }

  let pattern = search;

  // If not using regex, escape special regex characters
  if (!searchUseRegex) {
    // Escape special regex characters
    pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // If matching whole word, add word boundary assertions
  if (searchMatchWholeWord) {
    pattern = `\\b${pattern}\\b`;
  }

  // Create and return the RegExp object with appropriate flags
  return new RegExp(pattern, searchCaseSensitive ? "" : "i");
};
