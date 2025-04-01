import { PathFilterOptions } from "./types.js";
import micromatch from "micromatch";

/**
 * Convert a string pattern to an array of patterns
 * Handles comma-separated patterns as well as single patterns
 */
const normalizePatterns = (patterns: string): string[] => {
  if (
    patterns.includes(",") &&
    !patterns.includes("{") &&
    !patterns.includes("[")
  ) {
    return patterns.split(",").map((p) => p.trim());
  }

  return [patterns];
};
/**
 * Performs fuzzy matching similar to VS Code's Cmd+P functionality
 * @param pattern Pattern to match
 * @param str String to match against
 * @returns true if pattern fuzzy-matches the string
 */
function fuzzyMatch(pattern: string, str: string): boolean {
  if (!pattern) return true;

  // Convert to lowercase for case-insensitive matching
  const patternLower = pattern.toLowerCase();
  const strLower = str.toLowerCase();

  let patternIdx = 0;
  let strIdx = 0;

  // Simple fuzzy matching algorithm
  while (patternIdx < patternLower.length && strIdx < strLower.length) {
    if (patternLower[patternIdx] === strLower[strIdx]) {
      patternIdx++;
    }
    strIdx++;
  }

  // If we've gone through the entire pattern, it's a match
  return patternIdx === patternLower.length;
}

const patternMatchersCache = new Map<string, (path: string) => boolean>();
const excludePatternMatchersCache = new Map<
  string,
  (path: string) => boolean
>();

const getCachedMatcher = (
  pattern: string,
  cache: Map<string, (path: string) => boolean>,
  options: micromatch.Options = {},
): ((path: string) => boolean) => {
  const cacheKey = `${pattern}:${JSON.stringify(options)}`;
  if (!cache.has(cacheKey)) {
    const matcher = micromatch.matcher(pattern, options);
    cache.set(cacheKey, matcher);
  }
  return cache.get(cacheKey)!;
};

export const pathFilter = (
  context: {
    yamlParse?: any;
    filePath: string;
  } & PathFilterOptions,
): boolean => {
  const {
    excludeDir,
    excludeExt,
    filePath,
    includeDir,
    includeExt,
    allowedPath,
    yamlParse,
    matchFilenames,

    // to be implemented
    enableFuzzyMatching,
    excludePathPatterns,
    pathPatterns,

    // implemented elsewhere
    //yamlString,
    // disableGenignore,
  } = context;

  // Handle path patterns (glob matching) first if specified
  if (pathPatterns) {
    if (enableFuzzyMatching) {
      const isMatch = fuzzyMatch(pathPatterns, filePath);
      if (!isMatch) {
        return false;
      }
    }

    const patterns = normalizePatterns(pathPatterns);
    const isMatch = patterns.some((pattern) => {
      const matcher = getCachedMatcher(pattern, patternMatchersCache, {
        dot: true,
        nocase: false,
        basename: true,
      });
      return matcher(filePath);
    });

    console.log({ filePath, patterns, isMatch });

    if (!isMatch) {
      return false;
    }
  }

  // Handle exclude path patterns if specified
  if (excludePathPatterns) {
    const excludePatterns = normalizePatterns(excludePathPatterns);
    const excludeOptions = {
      dot: true, // Match dotfiles
    };

    const isExcluded = excludePatterns.some((pattern) => {
      const matcher = getCachedMatcher(
        pattern,
        excludePatternMatchersCache,
        excludeOptions,
      );
      return matcher(filePath);
    });

    if (isExcluded) {
      return false;
    }
  }

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
    allowedPath && allowedPath.length > 0
      ? allowedPath.some(
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
