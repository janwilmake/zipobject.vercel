import { ModuleItem } from "@swc/core";
/**
 * NB: currently only works for types and interfaces
 */
export const getModuleItemName = (moduleItem: ModuleItem) => {
  // exported types
  if (
    moduleItem.type === "ExportDeclaration" &&
    (moduleItem.declaration.type === "TsInterfaceDeclaration" ||
      moduleItem.declaration.type === "TsTypeAliasDeclaration") &&
    moduleItem.declaration.id.type === "Identifier"
  ) {
    return moduleItem.declaration.id.value;
  }

  // types
  if (
    (moduleItem.type === "TsInterfaceDeclaration" ||
      moduleItem.type === "TsTypeAliasDeclaration") &&
    moduleItem.id.type === "Identifier"
  ) {
    return moduleItem.id.value;
  }

  //NB: rest is not suppored
  return undefined;
};
