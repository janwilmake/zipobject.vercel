import { Declaration } from "@swc/core";
import { ExportDeclaration } from "@swc/core";
import { ModuleItem } from "@swc/core";
import { notEmpty } from "edge-util";
import { getSwcFunctionsFromDeclaration } from "./getSwcFunctionsFromDeclaration";
import { FileSpan, SwcFunction, SwcVariable } from "./types";
import { getIsModuleItemSwcFunction } from "./getIsModuleItemSwcFunction";
/**
Gets all swc functions
- get regular functions (exported or not) 
- get arrow functions (exported or not)

TODO:
- also get the config attached as part of the raw span
- along the same lines: ensure the config for models would be attached when getting all fsorm models

*/
export const getSwcFunctions = (
  swcModuleItems: ModuleItem[],
  filePath: string,
  fileSpan: FileSpan,
): SwcFunction[] => {
  const swcFunctions = swcModuleItems
    .map((item) => {
      if (getIsModuleItemSwcFunction(item)) {
        return getSwcFunctionsFromDeclaration(item, filePath, fileSpan);
      }

      return undefined;
    })
    .filter(notEmpty)
    .flat();

  return swcFunctions;
};
