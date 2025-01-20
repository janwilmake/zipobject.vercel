import { Declaration } from "@swc/core";
import { ExportDeclaration } from "@swc/core";
import { VariableDeclarator } from "@swc/core";
import { makeRelative } from "edge-util";
import { getRealSpan } from "./getRealSpan";
import { FileSpan, SwcFunction } from "./types";
export const getSwcFunctionFromVariableDeclarator = (
  item: Declaration | ExportDeclaration,
  variableDeclarator: VariableDeclarator,
  fileSpan: FileSpan,
  filePath: string,
) => {
  const name =
    variableDeclarator.id.type === "Identifier"
      ? variableDeclarator.id.value
      : undefined;
  if (!name) {
    return;
  }

  if (variableDeclarator.init?.type !== "ArrowFunctionExpression") {
    return;
  }

  //  console.log(x.span);
  const { start, end, relevantCode } = getRealSpan(item.span, fileSpan);

  const swcFunction: SwcFunction = {
    modelName: "SwcFunction",
    name,
    start,
    end,
    length: end - start,
    raw: relevantCode,
    filePath,
    isExported: item.type === "ExportDeclaration",
  };

  return swcFunction;
};
