//goal: fix all broken imports, then rebuild everything in the right order
import { getSwcFunctions } from "./getSwcFunctions";
import { getSwcImports } from "./getSwcImports";
import { getSwcInterfaces } from "./getSwcInterfaces";
import { getSwcVariables } from "./getSwcVariable";
import { SwcFileParse, SwcStatement, TypescriptFileData } from "./types";

/**
 Returns the `TypescriptInstance`[] for a piece of typescript code, using swc to parse it.

 TODO: get the playground for some of my own files, until I understand well enough how the AST works. isn't there a SWC vscode plugin, in the meantime?

 */
export const getTypescriptFileData = async (
  filePath: string,
  fileParse: SwcFileParse,
): Promise<
  {
    isSuccessful: boolean;
    message?: string;
  } & Partial<TypescriptFileData>
> => {
  const { body, fileSpan } = fileParse;

  //  console.log({ fileSpan });
  // 1) get all things we need to attach to the instances
  const imports = getSwcImports(body, filePath, fileSpan);

  // 2) get the instances we usually have at the fileroot
  const swcFunctions: SwcStatement[] = getSwcFunctions(
    body,
    filePath,
    fileSpan,
  );

  const swcVariables = getSwcVariables(body, filePath, fileSpan);

  const swcInterfaces = getSwcInterfaces(body, filePath, fileSpan);

  // 3) attach comments and imports to the statements, until they are all gone.
  // NB: todo

  // 4) put it all together
  const statements: SwcStatement[] = swcInterfaces
    .concat(swcVariables)
    .concat(swcFunctions);

  // NB: let's keep the order in `getTypescriptFileData` 100% correct. As some variables may sometimes call functions, it's important to not forget this and sort afterwards by starting line.
  const sortedStatements = statements.sort((a, b) => a.start - b.start);

  return { statements: sortedStatements, imports, isSuccessful: true };
};
