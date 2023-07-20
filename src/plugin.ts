import { ParserPlugin } from "@syuilo/aiscript";
import { stdScope, typeCheckBlock } from "./checker.js";

export const plugin: ParserPlugin = (nodes) => {
  const errors = typeCheckBlock(nodes as any, stdScope);
  if (errors.length) {
    throw errors;
  }

  return nodes;
};
