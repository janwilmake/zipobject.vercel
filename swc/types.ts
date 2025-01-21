import type { ModuleItem } from "@swc/core";
import type { Span } from "@swc/core";
export type MappedObject<T> = {
  [mapKey: string]: T;
};
export const operationClassificationConst = [
  // general
  "cjs",
  "ts",
  "esm",

  // backend
  "node-cjs",
  "node-cjs-sdk",
  "node-esm",
  "node-ts",
  "server-cjs",

  // frontend
  "ui-web",
  "ui-app",
  "ui-ts",
  "ui-cjs",
  "ui-esm",
] as const;

/**
 * TODO: Ensure embedding this will embed the actual docs in my markdown renderer. I guess it might already do so!
 *
 * ![](../docs/OperationClassification.md)
 *
 * TODO: It would be great to learn more about this topic and see if I can make more cross-environment packages. A great use case would be to create a wrapper around the current `fs-orm` to enable using it at the frontend too.
 */
export type OperationClassification =
  (typeof operationClassificationConst)[number];

export type TsInterfaceProperties = {
  /**
   * boolean indicating whether or not this interface uses one or more generic variables
   */
  hasGeneric?: boolean;

  /**
   * if the interface extends anything, names will be specified here
   */
  extensions?: string[];

  /**
   * If true, this interface is marked as a db model, which means it will be included in the db function autocompletion so it's easy to store and fetch data in this format.
   *
   * Is automatically set to true when indexing and when one of the following statements holds true
   *
   * - if the doc-comment contains frontmatter with `isDbModel` or `dbStorageMethod` specified
   * - if the interface last word is "db" or "model" and if there are minimum 2 words
   * - if the interface extends some other special interface
   */
  isDbModel?: boolean;

  /**
   * If this is true, this is a db-model that is ALWAYS attached to an operation.
   *
   * By default this means it will get a folder in the `db` folder in the operation folder, where the interface will be stored linked to the file-id in specified folder.
   *
   * However, you can also specify a `storageLocationRelativeFilePath` if you want to store the model on an exact location relative to the operation root.
   */
  isOperationIndex?: boolean;

  /**
   * If given, specify a file path here where the data should be stored.
   * Must be an operation relative path.
   *
   * This will map onto the "operationRelativePath" for that instance.
   *
   * NB: Since this is a single file per project or per operation, it will overwrite your data in case of `jsonSingle` or `markdown` storage.
   */
  operationStorageLocationRelativeFilePath?: string;
  projectRelativeStorageLocationFilePath?: string;
  /**
    The DbStorageMethod for this inteface (only for db models, otherwise this will be undefined)
    
    If this interface is a db model, you can also specify the default db storage method for it. You can do this by specifying it in the frontmatter of the doccomment of the interface. You can also extend a xxxModelType model which can have a dbStorageMethod attached.
  
    When storing something into the database, this value can be overwritten in your query configuration. 
  
      */
  dbStorageMethod?: DbStorageMethod;

  authorizations?: GroupAuthorizationObject;
  /**
   * TODO:
   */
  type?: TypeInfo;
};
/**
The key, groupName, is a slug of a group, or a wildcard (*) for all groups

The value should be a concatenation of all operations permitted in this dataset.

- C for create
- R for read
- U for update
- D for delete

Example: `{ "cfa": "CRUD" }` would say that this dataset can be fully altered and read by the "cfa" group

For `Dataset`s this should be applied through the database.

For database models, this should be applied in frontmatter, like this:

```
---
authorizations: cfa:crud, public:r
---
```

The above applies on the database. 

For functions, see StandardFunctionConfig

For memory (text), you can apply authorizations in frontmatter of the markdown, in the same way as you can for data (canRead/canWrite are the only ones needed).

NB: In a later stage we may add more permissions like "isSearchable (S)"

*/
export type GroupAuthorizationObject = {
  [groupName: string]: string;
};

/**
 * all info that should always be collected when indexing any type interface
 */
export type TypeInfo = {
  /** JSON schema definition of a type interface
   *
   *
   * Some info about the Schema:
   *
   * - if the type is an object, there should be properties
   * - if the type is an array, there should be items
   */
  typeDefinition: any | undefined;
  simplifiedSchema?: SimplifiedSchema;
  /** if the type is an object, this is true. false if it's an array */
  isObject: boolean;
  /** if the type is an array, this is true */
  isArray: boolean;
  /** if it's a primitive type like "string", "number", "boolean", "null" | "undefined" */
  isPrimitive: boolean;
  /** will be true for any primitive conjunction types */
  isEnum: boolean;
  /** will be true for string conjunction types */
  isEnumLiteral: boolean;
  typeCoverage: TypeCoverage;
  /** raw type string */
  rawType: string;
};
/**
 * quantification of coverage of the specified type or subtypes in our database.
 */
export type TypeCoverage = number;

/**
 * Primitive type
 * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.1.1
 */
export type JSONSchema7Type =
  | string //
  | number
  | boolean
  | JSONSchema7Object
  | JSONSchema7Array
  | null;

// Workaround for infinite type recursion
export interface JSONSchema7Object {
  [key: string]: JSONSchema7Type;
}

// Workaround for infinite type recursion
// https://github.com/Microsoft/TypeScript/issues/3496#issuecomment-128553540
export interface JSONSchema7Array extends Array<JSONSchema7Type> {}

export type SimplifiedSchemaType =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array"
  | "null";

/**
JSONSchema7 derivative that has the following capabilities and and characteristics...

- does not include objects in objects that are also referenced to using xxxSlug or xxxId
- recursively finds the references and expands them, unless the references are circular
- easier to read
- has all the information we need
- is able to generate an object with values in the exact format the function needs it
- is able to easily generate a form
 */
export interface SimplifiedSchema {
  description?: string;
  /**
   * - string
   * - number
   * - boolean
   * - object
   * - array
   * - null
   *
   * NB: Omit doesn't work for the indexer! This would be the type: Omit<JSONSchema7TypeName, "integer">;
   */
  type: SimplifiedSchemaType;

  /** sometimes we still need to reference to another schema because this thing is recursive. In that case the ref name will be here */
  circularRefName?: string;
  /** in case of enums this could appear... mostly strings, but e.g. numbers can also be an enum I think */
  enum?: JSONSchema7Type[];
  /** in case of object, this will always appear */
  properties?: SimplifiedSchemaProperty[];
  /** in case of arrays, this will always appear */
  items?: SimplifiedSchemaItem[];

  /**
   * Full doccomment, parsed without all stars syntax.
   *
   * NB: besides this, every `CommentType` can optionally also be found as a property on the `SimplifiedSchema`
   */
  fullComment?: string;
}

export type SimplifiedSchemaProperty = {
  name: string;
  schema: SimplifiedSchema;
  /** NB: can't we put this in the SimplifiedSchema itself? */
  required: boolean;
};

export type SimplifiedSchemaItem = {
  /**
   * name in case of it being a reference, otherwise null
   */
  name: string | null;
  schema: SimplifiedSchema;
};

export const dbStorageMethodsConst = [
  "jsonMultiple",
  "jsonSingle",
  "markdown",
  "keyValueMarkdown",
  "csv",
] as const;
export const dbStorageMethods: string[] = [...dbStorageMethodsConst];

/** 
   
   The following strategies are available to store the data.
  
   - **jsonMultiple *(default)***: stores the data in a json file which is an array of this data structure. This file will be located in `db/[pluralized-kebab-case-model-name].json`
  
   - **jsonSingle**: stores the data in a json file which is of this data structure (single object) These files will be located in `db/[pluralized-kebab-case-model-name]/[instance-slug-or-id].json`
  
   - **markdown**: stores the data in a markdown file. Takes "markdown" parameter as the main markdown. The other parameters are stored as front-matter. This these files will be located in `db/[pluralized-kebab-case-model-name]/[instance-slug-or-id].md`
  
   - **keyValueMarkdown**: stores the data in key value markdown format. This file will be located in `db/[pluralized-kebab-case-model-name].md`
  
   - **csv**: stores the data in a csv file (only possible for flat object datastructures). This file will be located in `db/[pluralized-kebab-case-model-name].csv`
  
   ## Definitions:
  
  - [pluralized-kebab-case-model-name]: e.g. `StudentUser` becomes `student-users`
  - [instance-slug-or-id]: For all models with a slug parameter, the filename will be that slug of that instance. Otherwise, `id` will be used
   */
export type DbStorageMethod = (typeof dbStorageMethodsConst)[number];

// import type { ModelConfig } from "./util.js";
// import type { FunctionParameter } from "./util.js";
// import type { StandardFunctionConfig } from "./util.js";
// import type { SimplifiedSchema } from "./util.js";
// import { SchemaItem } from "./util.js";
/**
 * Instance (NB: imports aren't done separetely)
 */
export type SwcStatement = SwcFunction | SwcInterface | SwcVariable;

export type TypescriptFileData = {
  statements: SwcStatement[];
  imports: SwcImport[];
};

export type StatementIndexItem = {
  packageCategory: string | undefined;
  packageName: string | undefined;
  operationRelativeFilePath: string | undefined;
  config: object | undefined;
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
 * Inferred for every item
 *
 * If you create an interface that extends OrmItem, it will be included in the database.
 *
 * If you also add [modelName]Config in the same file, it will be used as configuration.
 */
export type OrmItem = {
  /**
   * JSON Schema location (URI)
   *
   * - If the item is stored as a single object in a file, should be here.
   * - If the item is stored in a file as an array, `$schema` will be in the object encapsulating the array under the items key
   */
  $schema?: string;
  /**
   * Where the item is/was stored
   */
  projectRelativePath?: string;
  /**
   * Absolute item location (not always given)
   */
  absolutePath?: string;
  /**
   * PascalCase name of the type interface of the model
   */
  modelName: string;
};

/** Model needed to store schema extractions from typescript.  */
export interface SchemaItem extends OrmItem {
  /** NB: This property contains an object of definitions! Not a single schema! */
  schema?: any | undefined;
  error?: string | undefined;
  /**
   * NB: not the absolute path of the file, but rather of the typescript file of the SwcStatement!
   */
  absolutePath: string | undefined;
  /**
   * NB: not the project relative path of the file, but rather of the typescript file of the SwcStatement!
   */
  projectRelativePath: string | undefined;
  name: string;
  packageName?: string;
  packageCategory?: string;
  operationRelativePath: string | undefined;
}

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
  config?: object;
};

/**
 * NB: the schemas in this interface need to have been stripped from things that do not need to be provided to the api such as StandardContext
 */
export interface FunctionParameter {
  name: string;
  schema?: any;
  simplifiedSchema?: SimplifiedSchema;
  required: boolean;
}

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
