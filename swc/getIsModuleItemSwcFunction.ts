import { Declaration } from "@swc/core";
import { ExportDeclaration } from "@swc/core";
import { ModuleItem } from "@swc/core";
import { getIsArrowDeclaration } from "./getIsArrowDeclaration.js";
export const getIsModuleItemSwcFunction = (
  item: ModuleItem,
): item is Declaration | ExportDeclaration => {
  const isFunctionDeclaration = item.type === "FunctionDeclaration";
  const isExportedFunctionDeclaration =
    item.type === "ExportDeclaration" &&
    item.declaration.type === "FunctionDeclaration";
  const isExportedArrowDeclaration =
    item.type === "ExportDeclaration" &&
    getIsArrowDeclaration(item.declaration);
  const isArrowDeclaration = getIsArrowDeclaration(item);

  return (
    isFunctionDeclaration ||
    isExportedFunctionDeclaration ||
    isArrowDeclaration ||
    isExportedArrowDeclaration
  );
};
