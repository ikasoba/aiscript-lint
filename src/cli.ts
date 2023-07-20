import fs from "fs/promises";
import { Parser } from "@syuilo/aiscript";
import { stdScope, typeCheckBlock } from "./checker.js";

const path = process.argv.slice(2)[0];
const code = await fs.readFile(path, "utf-8");
const lines = code.split(/\r\n|[\r\n]/g);

const ast = Parser.parse(code);
const scope = stdScope.createChildScope();
const errors = typeCheckBlock(ast, scope);

for (const err of errors) {
  let lineNumber =
    code.slice(0, err.location.start).match(/\r\n|[\r\n]/g)?.length ?? 0;
  const endOfBlock =
    lineNumber +
    (code.slice(err.location.start, err.location.end).split(/\r\n|[\r\n]/g)
      ?.length ?? 1);
  let block = "";

  for (; lineNumber < endOfBlock; lineNumber++) {
    block += `  \x1b[94m${lineNumber + 1}\x1b[0m: ${lines[lineNumber]}\n`;
  }

  console.error("\x1b[91mERROR:\x1b[0m " + err.message, `\n\n${block}`);
}
