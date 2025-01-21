import { ModuleItem } from "@swc/core";
import { FileSpan, SwcInterface } from "./types.js";
import { notEmpty } from "./util.js";
import { getModuleItemName } from "./getModuleItemName.js";
import { getRealSpan } from "./getRealSpan.js";
/**
For now, gets only names/locations and isExported  :) it's enough
 */
export const getSwcInterfaces = (
  swcModuleItems: ModuleItem[],
  filePath: string,
  fileSpan: FileSpan,
): SwcInterface[] => {
  const interfaceModuleItems = swcModuleItems.filter((x) => {
    if (["TsInterfaceDeclaration", "TsTypeAliasDeclaration"].includes(x.type)) {
      return true;
    }

    if (x.type === "ExportDeclaration") {
      if (
        ["TsInterfaceDeclaration", "TsTypeAliasDeclaration"].includes(
          x.declaration.type,
        )
      ) {
        return true;
      }
    }

    return false;
  });

  const swcInterfaces: SwcInterface[] = interfaceModuleItems
    .map((moduleItem) => {
      const name = getModuleItemName(moduleItem);
      if (!name) {
        return;
      }

      const { start, end, relevantCode } = getRealSpan(
        moduleItem.span,
        fileSpan,
      );

      const length = end - start;

      const isExported = moduleItem.type === "ExportDeclaration";
      const swcInterface: SwcInterface = {
        modelName: "SwcInterface",
        name,
        start,
        end,
        raw: relevantCode,
        length,
        filePath,
        isExported,
      };
      return swcInterface;
    })
    .filter(notEmpty);
  return swcInterfaces;
};
