import { ModuleItem, TsInterfaceBody, TsPropertySignature } from "@swc/core";
import { FileSpan, SwcInterface } from "./types.js";
import { notEmpty } from "./util.js";
import { getModuleItemName } from "./getModuleItemName.js";
import { getRealSpan } from "./getRealSpan.js";

const parseTsPropertySignature = (tsPropertySignature: TsPropertySignature) => {
  if (tsPropertySignature.key.type !== "Identifier") {
    return;
  }
  const key = tsPropertySignature.key.value;
  if (
    tsPropertySignature.typeAnnotation?.typeAnnotation.type !==
    "TsTypeReference"
  ) {
    return;
  }
  const tsEntityName =
    tsPropertySignature.typeAnnotation?.typeAnnotation.typeName;
  if (tsEntityName.type === "TsQualifiedName") {
    return;
  }
  const value = tsEntityName.value;
  return [key, value] as [string, string];
};
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

      const tsInterfaceBody: TsInterfaceBody | undefined =
        moduleItem.type === "ExportDeclaration"
          ? moduleItem.declaration.type === "TsInterfaceDeclaration"
            ? moduleItem.declaration.body
            : undefined
          : moduleItem.type === "TsInterfaceDeclaration"
          ? moduleItem.body
          : undefined;

      const tsType =
        moduleItem.type === "ExportDeclaration"
          ? moduleItem.declaration.type === "TsTypeAliasDeclaration"
            ? moduleItem.declaration.typeAnnotation
            : undefined
          : moduleItem.type === "TsTypeAliasDeclaration"
          ? moduleItem.typeAnnotation
          : undefined;

      const tsPropertySignatures: TsPropertySignature[] | undefined =
        tsInterfaceBody
          ? tsInterfaceBody.body
              .filter((element) => element.type === "TsPropertySignature")
              .map((x) => x as TsPropertySignature)
          : tsType?.type === "TsTypeLiteral"
          ? tsType.members
              .filter((x) => x.type === "TsPropertySignature")
              .map((x) => x as TsPropertySignature)
          : undefined;

      const object = tsPropertySignatures
        ? Object.fromEntries(
            tsPropertySignatures
              .map((item) => parseTsPropertySignature(item))
              .filter((x) => !!x)
              .map((x) => x as [string, string]),
          )
        : undefined;

      const swcInterface: SwcInterface = {
        modelName: "SwcInterface",
        object,
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
