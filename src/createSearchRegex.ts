import { ContentFilterOptions } from "./types.js";

export const createSearchRegex = ({
  search,
  searchCaseSensitive,
  searchMatchWholeWord,
  regex,
}: ContentFilterOptions): RegExp => {
  // Return empty regex if no search string is provided
  if (!search && !regex) {
    return new RegExp("");
  }

  // If not using regex, escape special regex characters
  let pattern = search ? search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : regex!;

  // If matching whole word, add word boundary assertions
  if (searchMatchWholeWord) {
    pattern = `\\b${pattern}\\b`;
  }

  // Create and return the RegExp object with appropriate flags
  return new RegExp(pattern, `${searchCaseSensitive ? "" : "i"}g`);
};
