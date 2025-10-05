import * as monaco from "monaco-editor";
import { Parser } from "@syuilo/aiscript";
import { stdScope, typeCheckBlock, getLine, getLineIndex } from "aiscript-lint";
import { install } from "./aiscript.language.js";
import { fromBase64, toBase64 } from "./util.js";

const defaultCode = "var hoge: str = 1234";

function App(
  wrapper: HTMLElement,
  code = localStorage.getItem("code") ?? defaultCode
) {
  const editor = monaco.editor.create(wrapper, {
    value: code,
    language: "aiscript",
    theme: "vs-dark",
    automaticLayout: true,
    fontFamily: "'Source Code Pro', 'Noto Sans Mono', monospace"
  });

  const model = editor.getModel()!;

  const lint = () => {
    const code = editor.getValue();
    localStorage.setItem("code", code);
    location.hash = `#code:${toBase64(code)}`;

    const markers: monaco.editor.IMarker[] = [];

    try {
      const ast = Parser.parse(code);

      const errors = typeCheckBlock(ast, stdScope);

      console.log("a", errors);

      for (const err of errors) {
        const startLine = err.location.start.line
        const startColumn = err.location.start.column;
        const endLine = err.location.end.line;
        const endColumn = err.location.end.column;

        console.log(`${startLine}:${startColumn}`);

        markers.push({
          message: err.message,
          startLineNumber: startLine,
          endLineNumber: endLine,
          startColumn: startColumn,
          endColumn: endColumn,
          owner: "aiscript",
          severity: monaco.MarkerSeverity.Error,
          resource: model.uri,
        });
      }
    } catch (e: any) {
      console.error(e);

      const message: string = e.message;
      const m = message.match(/\(Line ([0-9]+), Column ([0-9]+)\)/);

      if (m != null) {
        const [_, line, column] = m;

        markers.push({
          message: message,
          startLineNumber: +line,
          endLineNumber: +line,
          startColumn: +column,
          endColumn: 0,
          owner: "aiscript",
          severity: monaco.MarkerSeverity.Error,
          resource: model.uri,
        });
      }
    }

    monaco.editor.setModelMarkers(model, "aiscript", markers);
  };

  editor.getModel()?.onDidChangeContent(lint);
  lint();

  install(monaco);
}

window.addEventListener("load", () => {
  const wrapper = document.createElement("div");
  wrapper.id = "editor-wrapper";

  document.body.append(wrapper);

  let code;
  if (location.hash.startsWith("#code:")) {
    code = fromBase64(location.hash.slice(6));
  }
  App(wrapper, code);
});
