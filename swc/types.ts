import type { ModuleItem } from "@swc/core";
import type { Span } from "@swc/core";
import { MappedObject } from "edge-util";
import type { OperationClassification } from "edge-util";
import type { TsInterfaceProperties } from "edge-util";
import type { ModelConfig } from "edge-util";
import type { FunctionParameter } from "edge-util";
import type { StandardFunctionConfig } from "edge-util";
import type { SimplifiedSchema } from "edge-util";
import { SchemaItem } from "edge-util";
/**
 * Instance (NB: imports aren't done separetely)
 */
export type SwcStatement = SwcFunction | SwcInterface | SwcVariable;

export const swcStatementConfig = {
  modelName: "SwcStatement",
  storageLocation: "packages/[packageCategory]/[packageName]/statements.json",
  pathIndexKeys: ["packageName", "packageCategory"],
} as const satisfies ModelConfig;

export type TypescriptFileData = {
  statements: SwcStatement[];
  imports: SwcImport[];
};

export type StatementIndexItem = {
  packageCategory: string | undefined;
  packageName: string | undefined;
  operationRelativeFilePath: string | undefined;
  config:
    | (StandardFunctionConfig & {
        watchFilter?: any;
      })
    | undefined;
  parameterNames?: string[];
};
export type StatementIndex = MappedObject<StatementIndexItem>;
/**
 * Variable, function, or interface at the root of the file
 */
export type TsStatement = {
  $schema?: string;
  modelName: string;
  filePath: string;

  /**name (not necesarily unique, should be promoted though)*/
  name: string;
  /**
   * based on where it's found
   */
  packageName?: string;
  packageCategory?: string;

  operationClassification?: OperationClassification;

  start: number;
  end: number;
  /**
   * Raw code. NB: This may sometimes be buggy as it relies on a big hack and can break for example if there are emojis or weird characters in the code.
   */
  raw: string;
  /** raw code of the body without the input, type interface, and block around it */
  rawBodyCode?: string;
  length: number;
  /**
   * whether or not this statement is exported
   */
  isExported?: boolean;
  /**
   *
   * TODO:
   *
   * Parsed doc-comment or comment above, if available
   *
   * Can also be omitted in parse-step by specifying `omitComments`
   */
  comment?: string;
  /**
   * TODO:
   *
   * Imports required by this statement
   *
   * NB: for now, take all imports on top of the file.
   */
  imports?: SwcImport[];
};

/**
 */
export type SwcImport = {
  $schema?: string;
  modelName: string;
  name: string;
  /**
   * packageName where the import is found
   */
  packageName?: string;
  operationClassification?: OperationClassification;
  /**
   * module the import is importing (can also be a relative file or absolute file)
   */
  module: string;

  alias?: string;
  isTypeImport?: boolean;
  isDefaultImport?: boolean;
  isNamespaceImport?: boolean;
  /**
   * Not sure what this means, but if this means that the import isn't used, it would be great
   */
  isOptional: boolean;
  /**
   * relative import or absolute
   */
  isAbsolute: boolean;

  /**
   * NB: Initial query does not calculate this since it requires an additional round-trip
   */
  isModuleResolved?: boolean;

  start: number;
  end: number;
  length: number;
  raw: string;
};

/**
 * Arrow functions or regular functions
 *
 * All settings must be set in the typescript code itself and this will show up in `.config`
 */
export type SwcFunction = TsStatement & {
  $schema?: string;
  modelName: string;

  /**
   * NB: this is the complete schema including all `StandardContext`
   */
  namedParameters?: SchemaItem;

  /** contains all definitions around the named parameters except the named parameters itself */
  otherDefs?: { [key: string]: { [k: string]: any } };

  /** NB: in this property the `StandardContext` properties have been stripped off */
  parameters?: FunctionParameter[];

  /** Not implemented fully yet, but we have a schema if `[functionName]Response` is present
   *
   * E.g. for `doSomething` it should contain the `DoSomethingResponse` interface
   */
  returnType?: {
    simplifiedSchema?: SimplifiedSchema;
    isPromise?: boolean;
    /**
     * For now, this is only given if `[functionName]Response` is present in the file
     */
    schema?: { [k: string]: any };
  };

  // /**
  //  * All scoped statements that were found inside of the function
  //  */
  // scopedStatements?: SwcStatement[];

  /**
   * If the function is of a specific function type, declared at declaration, it's shown here
   */
  explicitTypeName?: string;

  /**
   * Amount of indentations made inside of this function
   */
  maxIndentationDepth?: number;

  /**
   * Can be added by the orm after getting it from the sdk
   */
  function?: (...params: any[]) => any;

  /**
   * Combination of all configuration found in the function.config object, if any.
   */
  config?: StandardFunctionConfig;
};

export type SwcInterface = TsStatement & TsInterfaceProperties;
export type SwcVariable = TsStatement & { statement?: any };

export type SwcFileParse = {
  src: string;
  filePath: string;
  body: ModuleItem[];
  fileSpan: FileSpan;
  interpreter: string;
};

/**
 * SWC Span is very limited in what info it has, so I created this additional type interface to get more accurate code from the file.
 */
export type FileSpan = Span & {
  /**
   * Dangle in beginning (assuming there's no dangle at the end, except a newline)
   */
  startDangle?: string;
  /**
   * Code without dangle
   */
  parsedCode: string;
};

export type SwcModels = {
  SwcStatement: SwcStatement;
  SwcInterface: SwcInterface;
  SwcFunction: SwcFunction;
  SwcVariable: SwcVariable;
};
