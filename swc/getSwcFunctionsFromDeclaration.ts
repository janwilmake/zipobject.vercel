import { Declaration } from "@swc/core";
import { ExportDeclaration } from "@swc/core";
import { notEmpty } from "edge-util";
import { getSwcFunctionFromFunctionDeclaration } from "./getSwcFunctionFromFunctionDeclaration";
import { getIsArrowDeclaration } from "./getIsArrowDeclaration";
import { getSwcFunctionFromVariableDeclarator } from "./getSwcFunctionFromVariableDeclarator";
import { FileSpan } from "./types";
/**
Detects and finds SwcFunctions in regular and arrow functions, exported or not
 */
export const getSwcFunctionsFromDeclaration = (
  item: Declaration | ExportDeclaration,
  filePath: string,
  fileSpan: FileSpan,
) => {
  if (
    item.type === "FunctionDeclaration" ||
    (item.type === "ExportDeclaration" &&
      item.declaration.type === "FunctionDeclaration")
  ) {
    return getSwcFunctionFromFunctionDeclaration(item, filePath, fileSpan);
  }

  if (
    item.type === "ExportDeclaration" &&
    getIsArrowDeclaration(item.declaration)
  ) {
    const swcFunctions = item.declaration.declarations
      .map((declarator) =>
        getSwcFunctionFromVariableDeclarator(
          item,
          declarator,
          fileSpan,
          filePath,
        ),
      )
      .filter(notEmpty);

    return swcFunctions;
  }

  if (getIsArrowDeclaration(item)) {
    const swcFunctions = item.declarations
      .map((declarator) =>
        getSwcFunctionFromVariableDeclarator(
          item,
          declarator,
          fileSpan,
          filePath,
        ),
      )
      .filter(notEmpty);
    return swcFunctions;
  }
};
