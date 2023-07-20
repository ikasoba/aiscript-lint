import * as monaco from "monaco-editor";
import { Parser } from "@syuilo/aiscript";
import {
  stdScope,
  typeCheckBlock,
  getLine,
  getLineIndex,
} from "../../src/index.js";
import { install } from "./aiscript.language.js";

const defaultCode = "var hoge: str = 1234";

function App(wrapper: HTMLElement) {
  const code = localStorage.getItem("code") ?? defaultCode;

  const editor = monaco.editor.create(wrapper, {
    value: code,
    language: "aiscript",
    theme: "vs-dark",
  });

  const model = editor.getModel()!;

  const lint = () => {
    const code = editor.getValue();
    localStorage.setItem("code", code);

    const markers: monaco.editor.IMarker[] = [];

    try {
      const ast = Parser.parse(code);

      const errors = typeCheckBlock(ast, stdScope);

      for (const err of errors) {
        const startLine = getLine(code, err.location.start);
        const startColumn = getLineIndex(code, err.location.start);
        const endLine = getLine(code, err.location.end);
        const endColumn = getLineIndex(code, err.location.end);

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
      const message: string = e.message;
      const m = message.match(/\(Line ([0-9]+):([0-9]+)\)/);
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
  App(wrapper);
});
