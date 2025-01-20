import { ParseOptions, parseSync } from "@swc/core";
export const trySwcParse = (src: string, config: ParseOptions) => {
  try {
    const parseResult = parseSync(src, config);

    return { isSuccessful: true, parseResult, message: "Successful" };
  } catch (e) {
    console.log(e);
    return { isSuccessful: false, message: "Error" };
  }
};
