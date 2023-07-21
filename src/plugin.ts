import { ParserPlugin } from "@syuilo/aiscript";
import { typeCheckBlock } from "./checker.js";
import { stdScope } from "./type.js";

export const plugin: ParserPlugin = (nodes) => {
  const errors = typeCheckBlock(nodes as any, stdScope);
  if (errors.length) {
    throw errors;
  }

  return nodes;
};
