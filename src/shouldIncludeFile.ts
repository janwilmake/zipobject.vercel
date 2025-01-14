export const shouldIncludeFile = (context: {
  yamlParse?: any;
  filePath: string;
  includeExt?: string[];
  excludeExt?: string[];
  includeDir?: string[];
  excludeDir?: string[];
  allowedPaths?: string[];
  matchFilenames?: string[];
}) => {
  const {
    excludeDir,
    excludeExt,
    filePath,
    includeDir,
    includeExt,
    allowedPaths,
    yamlParse,
    matchFilenames,
  } = context;
  const ext = filePath.split(".").pop()!;
  // Only include desired files
  const lowercaseFilename = filePath.split("/").pop()!.toLowerCase();
  if (
    matchFilenames &&
    !matchFilenames.find((name) => name.toLowerCase() === lowercaseFilename)
  ) {
    return false;
  }

  if (includeExt && !includeExt.includes(ext)) return false;
  if (excludeExt && excludeExt.includes(ext)) return false;

  const surroundSlashes = (str: string) =>
    (str.startsWith("/") ? "" : "/") + str + (str.endsWith("/") ? "" : "/");
  // passing this omits include/exclude dir but stil allows for ext filter
  const pathAllowed =
    allowedPaths && allowedPaths.length > 0
      ? allowedPaths.some(
          (path) =>
            filePath.startsWith(surroundSlashes(path)) ||
            filePath + "/" === surroundSlashes(path),
        )
      : true;

  // here we're combining paths and the yamlfilter!
  if (yamlParse) {
    const isInYamlFilter: null | undefined = filePath
      .split("/")
      .reduce((yaml, chunk) => {
        return yaml?.[chunk];
      }, yamlParse);
    const shouldInclude = isInYamlFilter === null;
    return shouldInclude && pathAllowed;
  } else if (!pathAllowed) {
    return false;
  }

  if (includeDir && !includeDir.some((d) => filePath.slice(1).startsWith(d)))
    return false;
  if (excludeDir && excludeDir.some((d) => filePath.slice(1).startsWith(d)))
    return false;

  return true;
};
