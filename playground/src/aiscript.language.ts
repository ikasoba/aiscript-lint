import type Monaco from "monaco-editor";

export function install(monaco: typeof Monaco) {
  monaco.languages.register({ id: "aiscript" });

  monaco.languages.setMonarchTokensProvider("aiscript", {
    ident: /[a-zA-Z_][a-zA-Z_0-9]*/,
    keywords: [
      "if",
      "elif",
      "else",
      "each",
      "for",
      "eval",
      "match",
      "return",
      "var",
      "loop",
      "break",
      "continue",
      "let",
      "var",
    ],

    tokenizer: {
      root: [{ include: "common" }],

      common: [
        [/"/, "string", "@string_double"],
        [/'/, "string", "@string_single"],
        [/`/, "string", "@string_tmpl"],
        [/[+-]?(?:[1-9][0-9]+|[0-9])(?:\.[0-9]+)?/, "number"],
        [/[+-]?(?:[1-9][0-9]+|[0-9])/, "number"],
        [/true|false/, "keyword"],
        [/null/, "keyword"],
        [
          /@ident/,
          {
            cases: {
              "@keywords": "keyword",
              "@default": "type.identifier",
            },
          },
        ],
        [/[;,]/, "delimiter"],
        [/\/\*/, "comment", "@comment_multi"],
        [/\/\/.*/, "comment"],
        [/\s+/, ""],
      ],

      comment_multi: [
        [/[^\/*]+/, "comment"],
        [/\*\//, "comment", "@pop"],
      ],

      string_double: [
        [/[^\\"]+/, "string"],
        [/\\"/, "string.escape"],
        [/\\./, "string.escape.error"],
        [/"/, "string", "@pop"],
      ],

      string_single: [
        [/[^\\']+/, "string"],
        [/\\'/, "string.escape"],
        [/\\./, "string.escape.error"],
        [/'/, "string", "@pop"],
      ],

      string_tmpl: [
        [/\{/, "delimiter.bracket", "@tmpl_embed"],
        [/[^\\`{]+/, "string"],
        [/\\`/, "string.escape"],
        [/\\./, "string.escape.error"],
        [/`/, "string", "@pop"],
      ],

      tmpl_embed: [[/\}/, "delimiter.bracket", "@pop"], { include: "common" }],
    },
  });
}
