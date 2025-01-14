interface CompiledGitignore {
  accepts: (input: string) => boolean;
  denies: (input: string) => boolean;
  maybe: (input: string) => boolean;
}

interface ParsedGitignore {
  positives: [RegExp, RegExp];
  negatives: [RegExp, RegExp];
}

const prepareRegexes = (pattern: string): [string, string] => [
  prepareRegexPattern(pattern),
  preparePartialRegex(pattern),
];

const prepareRegexPattern = (pattern: string): string =>
  escapeRegex(pattern).replace("**", "(.+)").replace("*", "([^\\/]+)");

const preparePartialRegex = (pattern: string): string =>
  pattern
    .split("/")
    .map((item, index) =>
      index
        ? `([\\/]?(${prepareRegexPattern(item)}\\b|$))`
        : `(${prepareRegexPattern(item)}\\b)`,
    )
    .join("");

const escapeRegex = (pattern: string): string =>
  pattern.replace(/[\-\[\]\/\{\}\(\)\+\?\.\\\^\$\|]/g, "\\$&");

const createRegExp = (patterns: string[]): RegExp =>
  patterns.length > 0
    ? new RegExp(`^((${patterns.join(")|(")}))`)
    : new RegExp("$^");

/**
 * Parse the given `.gitignore` content and return an object
 * containing two arrays - positives and negatives.
 * Each of these two arrays in turn contains two regexps, one
 * strict and one for 'maybe'.
 *
 * @param content The content to parse.
 * @returns The parsed positive and negatives definitions.
 */
const parseGitignore = (content: string): ParsedGitignore => {
  const lists: [string[], string[]] = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && line[0] !== "#")
    .reduce(
      (lists, line) => {
        const isNegative = line[0] === "!";
        if (isNegative) {
          line = line.slice(1);
        }
        if (line[0] === "/") {
          line = line.slice(1);
        }
        lists[isNegative ? 1 : 0].push(line);
        return lists;
      },
      [[], []] as [string[], string[]],
    );

  const processedLists = lists.map((list) =>
    list
      .sort()
      .map(prepareRegexes)
      .reduce<[string[], string[]]>(
        (acc, [exact, partial]) => {
          acc[0].push(exact);
          acc[1].push(partial);
          return acc;
        },
        [[], []],
      ),
  );

  return {
    positives: processedLists[0].map(createRegExp) as [RegExp, RegExp],
    negatives: processedLists[1].map(createRegExp) as [RegExp, RegExp],
  };
};

/**
 * Compile the given `.gitignore` content (not filename!)
 * and return an object with `accepts`, `denies` and `maybe` methods.
 * These methods each accepts a single filename and determines whether
 * they are acceptable or unacceptable according to the `.gitignore` definition.
 *
 * @param content The `.gitignore` content to compile.
 * @returns The helper object with methods that operate on the compiled content.
 */
export const compile = (content: string): CompiledGitignore => {
  const { positives, negatives } = parseGitignore(content);

  const checkInput = (input: string): string =>
    input[0] === "/" ? input.slice(1) : input;

  return {
    accepts: (input: string): boolean => {
      input = checkInput(input);
      return negatives[0].test(input) || !positives[0].test(input);
    },
    denies: (input: string): boolean => {
      input = checkInput(input);
      return !(negatives[0].test(input) || !positives[0].test(input));
    },
    maybe: (input: string): boolean => {
      input = checkInput(input);
      return negatives[1].test(input) || !positives[1].test(input);
    },
  };
};
