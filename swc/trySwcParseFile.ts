import { ParseOptions } from "@swc/core";
import { trySwcParse } from "./trySwcParse";
import { SwcFileParse } from "./types";
/**ugliest hack ever but it fixes the problem that dangles at the end aren't detected */
export const withTrueSuffix = (src: string) => {
  if (src.endsWith("\ntrue;\n")) {
    return src;
  }
  if (src.endsWith("\n")) {
    return `${src}true;\n`;
  }
  return `${src}\ntrue;\n`;
};

/**
Applies parse from `@swc/core`, wraps it in a try/catch, and adds some functionality, primarily around fixing the span
*/
export const trySwcParseFile = (
  filePath: string,
  src: string,
  config: ParseOptions,
): {
  isSuccessful: boolean;
  message?: string;
  isCached?: boolean;
  result?: SwcFileParse;
} => {
  const realSrc = withTrueSuffix(src);
  // console.log({ realSrc });

  const { parseResult, isSuccessful, message } = trySwcParse(realSrc, config);

  if (!parseResult) {
    console.log({ isSuccessful, message });
    return { isSuccessful: false, message: "Error" };
  }
  // console.log(parseResult.span);

  const srcStringLength = realSrc.length - 1;
  // NB: prettier automatically adds one newline at the end!

  const start = parseResult.span.start;
  const end = parseResult.span.end;
  const spanLength = end - start;
  const startDangleLength =
    srcStringLength - spanLength < 0 ? 0 : srcStringLength - spanLength;

  const hasStartDangle = startDangleLength > 0;

  const startDangle = hasStartDangle
    ? realSrc.substring(0, startDangleLength)
    : undefined;
  const endPosition = startDangleLength + spanLength;

  // console.log({
  //   start,
  //   end,
  //   spanLength,
  //   startDangleLength,
  //   hasStartDangle,
  //   endPosition,
  // });

  const parsedCode = realSrc.slice(startDangleLength, endPosition);

  // console.log({ realSrc: realSrc.length, startDangleLength, endPosition });
  const endDangle = realSrc.slice(endPosition);

  const fileSpan = {
    ctxt: parseResult.span.ctxt,
    start,
    end,
    startDangle,
    parsedCode,
  };
  // Newline allowed
  if (endDangle.length > 1) {
    //  console.log({ absolutePath, endDangle });
  }
  // after this, set lastStartOffset

  // console.log({ hasStartDangle, endDangle, startDangle });

  const { body, interpreter } = parseResult;
  const result = {
    src: realSrc,
    filePath,
    body,
    interpreter,
    fileSpan,
  };

  // console.log(parseResult.body);

  return {
    isSuccessful: true,
    isCached: false,
    result,
  };
};
