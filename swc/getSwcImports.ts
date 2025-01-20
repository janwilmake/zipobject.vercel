import { ImportDeclaration, ModuleItem } from "@swc/core";
import { ImportDefaultSpecifier } from "@swc/core";
import { ImportNamespaceSpecifier } from "@swc/core";
import { NamedImportSpecifier } from "@swc/core";
import { isAbsoluteImport } from "edge-util";
import { getRealSpan } from "./getRealSpan";
import { FileSpan, SwcImport } from "./types";
/**
 * Takes swcModuleItems, and returns an array of imports (name + module)
 */
export const getSwcImports = (
  swcModuleItems: ModuleItem[],
  filePath: string,
  fileSpan: FileSpan,
  // operations: { [key: string]: string },
): SwcImport[] => {
  //  const allOperations = Object.keys(operations);

  const imports = swcModuleItems
    .filter((item) => {
      //@ts-ignore
      return item.type === "ImportDeclaration";
    })
    .map((moduleItem) => {
      return moduleItem as ImportDeclaration;
    })
    .map((importDeclaration) => {
      // console.dir({ importDeclaration }, { depth: 99 });
      const span = getRealSpan(importDeclaration.span, fileSpan);
      const { start, end, relevantCode } = span;
      const length = end - start;
      const module = importDeclaration.source.value;
      const isTypeImport = importDeclaration.typeOnly;
      const isAbsolute = isAbsoluteImport(module);
      // console.log({ length, start, end });
      const importSoFar = {
        modelName: "SwcImport",
        filePath,
        //packageName,
        module,
        isAbsolute,
        isTypeImport,
        start,
        end,
        length,
        raw: relevantCode,
      };

      const imports = importDeclaration.specifiers.map((specifier) => {
        if (specifier.type === "ImportDefaultSpecifier") {
          const importDefaultSpecifier = specifier as ImportDefaultSpecifier;

          const swcImport: SwcImport = {
            ...importSoFar,
            name: importDefaultSpecifier.local.value,
            isOptional: importDefaultSpecifier.local.optional,
            isDefaultImport: true,
          };

          return swcImport;
        }

        if (specifier.type === "ImportNamespaceSpecifier") {
          const importNamespaceSpecifier =
            specifier as ImportNamespaceSpecifier;

          const swcImport: SwcImport = {
            ...importSoFar,
            name: importNamespaceSpecifier.local.value,
            isOptional: importNamespaceSpecifier.local.optional,
            isNamespaceImport: true,
          };

          return swcImport;
        }

        const namedImportSpecifier = specifier as NamedImportSpecifier;

        const swcImport: SwcImport = {
          ...importSoFar,
          name:
            namedImportSpecifier.imported?.value ||
            namedImportSpecifier.local.value,
          alias: namedImportSpecifier.imported?.value
            ? namedImportSpecifier.local.value
            : undefined,
          isOptional: namedImportSpecifier.local.optional,
        };

        return swcImport;
      });
      return imports;
    })
    .flat();

  return imports;
};
