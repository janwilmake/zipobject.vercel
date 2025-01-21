import { Span } from "@swc/core";
import { FileSpan } from "./types.js";
/**
Very important and unclear function. This function substracts the fileSpan offset from the span of the item, so you can get the relevant code.
 */
export const getRealSpan = (span: Span, fileSpan: FileSpan) => {
  const start = span.start - fileSpan.start;
  const end = span.end - fileSpan.start;

  const relevantCode = fileSpan.parsedCode.slice(start, end);
  return {
    start,
    end,
    relevantCode,
  };
};
