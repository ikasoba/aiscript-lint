import packageJson from "aiscript-lint/package.json";

document.getElementById(
  "version"
)!.innerText = `バージョン: ${packageJson.version}`;
