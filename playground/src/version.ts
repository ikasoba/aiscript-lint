import packageJson from "aiscript-lint/package.json";
import aiscriptPackageJson from "@syuilo/aiscript/package.json";

document.getElementById(
  "version"
)!.innerText = `バージョン: ${packageJson.version} | AiScriptのバージョン: ${aiscriptPackageJson.version}`;
