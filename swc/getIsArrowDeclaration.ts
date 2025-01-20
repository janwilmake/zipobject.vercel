import { ModuleItem } from "@swc/core";
import { VariableDeclaration } from "@swc/core";
export const getIsArrowDeclaration = (
  moduleItem: ModuleItem,
): moduleItem is VariableDeclaration => {
  return (
    moduleItem.type === "VariableDeclaration" &&
    !!moduleItem.declarations.find(
      (x) => x.init?.type === "ArrowFunctionExpression",
    )
  );
};
