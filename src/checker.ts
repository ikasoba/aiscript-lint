import { Parser, Ast } from "@syuilo/aiscript";
import { AiType, Type } from "./type.js";

export * from "./type.js";

type Node = Ast.Node;
type TypeSource = Ast.TypeSource;

export function toStringAiType(type: AiType): string {
  if (type.type == "primitiveTypeName") {
    return type.name;
  } else if (type.type == "functionType") {
    let args;
    if (type.args instanceof Array) {
      args = type.args.map(toStringAiType).join(", ");
    } else {
      args = "...any";
    }

    return `@(${args}): ${toStringAiType(type.returnType)}`;
  } else if (type.type == "unionType") {
    return type.children.map((x) => toStringAiType(x)).join(" | ");
  } else if (type.type == "tupleType") {
    return "[" + type.children.map((x) => toStringAiType(x)).join(", ") + "]";
  } else {
    console.log(type);
    return "<unknown>";
  }
}

export class Scope {
  constructor(
    public variables: { [k: string]: AiType | undefined },
    public types: { [k: string]: AiType | undefined },
    public parent: Scope | null = null
  ) {}

  getVariable(name: string): AiType | undefined {
    return this.variables[name] ?? this.parent?.getVariable(name);
  }

  getType(name: string): AiType | undefined {
    return this.types[name] ?? this.parent?.getType(name);
  }

  setVariable(name: string, type: AiType): AiType | undefined {
    return (this.variables[name] = type);
  }

  setType(name: string, type: AiType): AiType | undefined {
    return (this.types[name] = type);
  }

  createChildScope(): Scope {
    return new Scope({}, {}, this);
  }
}

export const stdTypes = {
  num: { type: "primitiveTypeName", name: "num" },
  bool: { type: "primitiveTypeName", name: "bool" },
  str: { type: "primitiveTypeName", name: "str" },
  arr: { type: "primitiveTypeName", name: "arr" },
  obj: { type: "primitiveTypeName", name: "obj" },
  null: { type: "primitiveTypeName", name: "null" },
  any: { type: "primitiveTypeName", name: "any" },
} satisfies { [k: string]: AiType };

export const stdScope: Scope = new Scope(
  {
    help: stdTypes.str,
    "Core:v": stdTypes.str,
    "Core:ai": stdTypes.str,
    "Core:not": {
      type: "functionType",
      args: Type.tuple(stdTypes.bool),
      returnType: stdTypes.bool,
    },
    "Core:eq": {
      type: "functionType",
      args: Type.tuple(stdTypes.any, stdTypes.any),
      returnType: stdTypes.bool,
    },
    "Core:neq": {
      type: "functionType",
      args: Type.tuple(stdTypes.any, stdTypes.any),
      returnType: stdTypes.bool,
    },
    "Core:and": {
      type: "functionType",
      args: Type.tuple(stdTypes.bool, stdTypes.bool),
      returnType: stdTypes.bool,
    },
    "Core:or": {
      type: "functionType",
      args: Type.tuple(stdTypes.bool, stdTypes.bool),
      returnType: stdTypes.bool,
    },
    "Core:add": {
      type: "functionType",
      args: Type.tuple(stdTypes.num, stdTypes.num),
      returnType: stdTypes.num,
    },
    "Core:sub": {
      type: "functionType",
      args: Type.tuple(stdTypes.num, stdTypes.num),
      returnType: stdTypes.num,
    },
    "Core:mul": {
      type: "functionType",
      args: Type.tuple(stdTypes.num, stdTypes.num),
      returnType: stdTypes.num,
    },
    "Core:div": {
      type: "functionType",
      args: Type.tuple(stdTypes.num, stdTypes.num),
      returnType: stdTypes.num,
    },
    "Core:pow": {
      type: "functionType",
      args: Type.tuple(stdTypes.num, stdTypes.num),
      returnType: stdTypes.num,
    },
    "Core:mod": {
      type: "functionType",
      args: Type.tuple(stdTypes.num, stdTypes.num),
      returnType: stdTypes.num,
    },
    "Core:gt": {
      type: "functionType",
      args: Type.tuple(stdTypes.num, stdTypes.num),
      returnType: stdTypes.bool,
    },
    "Core:lt": {
      type: "functionType",
      args: Type.tuple(stdTypes.num, stdTypes.num),
      returnType: stdTypes.num,
    },
    "Core:gteq": {
      type: "functionType",
      args: Type.tuple(stdTypes.num, stdTypes.num),
      returnType: stdTypes.num,
    },
    "Core:lteq": {
      type: "functionType",
      args: Type.tuple(stdTypes.num, stdTypes.num),
      returnType: stdTypes.num,
    },
    "Core:type": {
      type: "functionType",
      args: Type.tuple(stdTypes.any),
      returnType: stdTypes.str,
    },
    "Core:to_str": {
      type: "functionType",
      args: Type.tuple(stdTypes.any),
      returnType: stdTypes.str,
    },
    "Core:range": {
      type: "functionType",
      args: Type.tuple(stdTypes.num, stdTypes.num),
      returnType: stdTypes.arr,
    },
    "Util:uuid": {
      type: "functionType",
      args: Type.tuple(),
      returnType: stdTypes.str,
    },
    "Json:stringify": {
      type: "functionType",
      args: Type.tuple(stdTypes.any),
      returnType: stdTypes.str,
    },
    "Json:parseable": {
      type: "functionType",
      args: Type.tuple(stdTypes.str),
      returnType: stdTypes.bool,
    },
    "Date:now": {
      type: "functionType",
      args: Type.tuple(),
      returnType: stdTypes.num,
    },
    "Date:year": {
      type: "functionType",
      args: Type.union(Type.tuple(stdTypes.num), Type.tuple()),
      returnType: stdTypes.num,
    },
  },
  stdTypes
);

export class TypeError extends Error {
  constructor(
    message: string,
    public location: { start: number; end: number } = { start: 0, end: 0 }
  ) {
    super(message + ` start: ${location.start} end: ${location.end}`);
  }
}

export function typeCheck(
  node: Node,
  scope: Scope,
  parent?: Node
): TypeError[] {
  const errors: TypeError[] = [];

  if (node.type == "def") {
    const varType = node.varType
      ? getType(node.varType, scope)
      : getType(node.expr, scope)!;

    const exprType = getType(node.expr, scope)!;
    errors.push(...typeCheck(node.expr, scope, parent));

    errors.push(
      ...compareType(varType, exprType, scope).map(
        (msg) => new TypeError(msg, node.loc)
      )
    );

    scope.setVariable(node.name, varType);
  } else if (node.type == "assign") {
    const varType = getType(node.dest, scope);
    const exprType = getType(node.expr, scope);
    errors.push(...typeCheck(node.expr, scope, parent));

    errors.push(
      ...compareType(varType, exprType, scope).map(
        (msg) => new TypeError(msg, node.dest.loc!)
      )
    );
  } else if (node.type == "call") {
    const functionType = getType(node.target, scope);

    if (!isAny(functionType) && functionType.type != "functionType") {
      errors.push(
        new TypeError(
          `${toStringAiType(functionType)}は関数型ではありません`,
          node.target.loc!
        )
      );
    }

    if (functionType.type == "functionType") {
      if (functionType.args.type == "tupleType") {
        if (node.args.length != functionType.args.children.length) {
          errors.push(new TypeError(`引数の数が足りません`, node.loc!));
        }
      }

      const args = functionType.args;
      const argTypes = Type.tuple(...node.args.map((x) => getType(x, scope)));

      console.log("a - ", args, argTypes);

      errors.push(
        ...compareType(args, argTypes, scope).map(
          (msg) => new TypeError(msg, node.loc)
        )
      );
    }
  } else if (node.type == "addAssign" || node.type == "subAssign") {
    const targetType = getType(node.dest, scope);
    const valueType = getType(node.expr, scope);
    errors.push(...typeCheck(node.expr, scope, parent));

    errors.push(
      ...compareType(targetType, stdTypes.num, scope).map(
        (msg) => new TypeError(msg, node.dest.loc!)
      )
    );

    errors.push(
      ...compareType(valueType, stdTypes.num, scope).map(
        (msg) => new TypeError(msg, node.expr.loc!)
      )
    );
  } else if (node.type == "for") {
    const forScope = scope.createChildScope();
    if (node.var != null) {
      forScope.setVariable(node.var, stdTypes.num);
    }

    errors.push(...typeCheck(node.for, forScope, parent));
  } else if (node.type == "block") {
    errors.push(
      ...typeCheckBlock(node.statements, scope.createChildScope(), parent)
    );
  } else if (node.type == "if") {
    errors.push(...typeCheck(node.cond, scope.createChildScope(), parent));
    errors.push(...typeCheck(node.then, scope.createChildScope(), parent));
    if (node.else)
      errors.push(...typeCheck(node.else, scope.createChildScope(), parent));
    errors.push(
      ...node.elseif.flatMap((x) =>
        typeCheck(x.then, scope.createChildScope(), parent)
      )
    );
  } else if (node.type == "ns") {
    const nsScope = scope.createChildScope();

    errors.push(...typeCheckBlock(node.members, nsScope, parent));

    for (const k in nsScope.variables) {
      const value = nsScope.variables[k];
      if (value == null) continue;
      scope.setVariable(`${node.name}:${k}`, value);
    }
  } else if (node.type == "arr") {
    errors.push(...node.value.flatMap((x) => typeCheck(x, scope, parent)));
  } else if (node.type == "obj") {
    errors.push(
      ...[...node.value.values()].flatMap((x) => typeCheck(x, scope, parent))
    );
  } else if (node.type == "return") {
    errors.push(...typeCheck(node.expr, scope, parent));
  } else if (node.type == "fn") {
    const fnScope = scope.createChildScope();

    for (const arg of node.args) {
      fnScope.setVariable(
        arg.name,
        arg.argType ? getType(arg.argType, scope) : stdTypes.any
      );
    }

    errors.push(...typeCheckBlock(node.children, fnScope, node));
  }

  return errors;
}

export function typeCheckBlock(
  nodes: Node[],
  scope: Scope,
  parent?: Node
): TypeError[] {
  const errors = [];

  for (const x of nodes) {
    if (parent?.type == "loop" && x.type == "break") {
    }

    errors.push(...typeCheck(x, scope, parent));

    if (parent?.type == "fn" && x.type == "return") {
      const fn = getType(parent, scope);
      const valueType = getType(x.expr, scope);

      if (fn.type == "functionType") {
        errors.push(
          ...compareType(valueType, fn.returnType, scope).map(
            (msg) => new TypeError(msg, x.expr.loc)
          )
        );
      }
    }
  }

  return errors;
}

/**
 * xにyが代入可能か調べる
 */
export function compareType(x: AiType, y: AiType, scope: Scope): string[] {
  const errors = [];

  if (
    (x.type == "primitiveTypeName" && x.name == "any") ||
    (y.type == "primitiveTypeName" && y.name == "any")
  ) {
    return [];
  } else if (x.type == "functionType" && y.type == "functionType") {
    errors.push(...compareType(x.returnType, y.returnType, scope));

    errors.push(...compareType(x.args, y.args, scope));
  } else if (x.type == "unionType") {
    if (y.type == "unionType") {
      if (x.children.length < y.children.length) {
        errors.push(
          `${toStringAiType(y)}と${toStringAiType(x)}は一致していません`
        );
      } else {
        for (const yChild of y.children) {
          for (const xChild of x.children) {
            if (compareType(xChild, yChild, scope).length == 0) {
              break;
            } else {
              errors.push(
                `${toStringAiType(yChild)}は${toStringAiType(
                  x
                )}に含まれていません`
              );
            }
          }
        }
      }
    } else {
      let isContain = false;
      for (const xChild of x.children) {
        if (compareType(xChild, y, scope).length == 0) {
          isContain = true;
        }
      }
      if (!isContain) {
        errors.push(
          `${toStringAiType(y)}は${toStringAiType(x)}に含まれていません`
        );
      }
    }
  } else if (x.type == "tupleType" && y.type == "tupleType") {
    if (x.children.length != y.children.length) {
      errors.push(`${toStringAiType(y)}は${toStringAiType(x)}と一致しません。`);
    }

    for (let i = 0; i < x.children.length; i++) {
      if (!compareType(x.children[i], y.children[i], scope)) {
        errors.push(
          `${toStringAiType(y.children[i])}は${x.children[i]}と一致しません。`
        );
      }
    }
  } else if (x.type != y.type) {
    errors.push(`${toStringAiType(y)}は${toStringAiType(x)}と一致しません。`);
  } else if (
    x.type == "primitiveTypeName" &&
    y.type == "primitiveTypeName" &&
    x.name != y.name
  ) {
    errors.push(`${toStringAiType(y)}は${toStringAiType(x)}と一致しません。`);
  }

  return errors;
}

export function isAny(x: AiType): boolean {
  if (x.type == "primitiveTypeName" && x.name == "any") {
    return true;
  }
  return false;
}

export function getType(node: Node, scope: Scope): AiType {
  if (node.type == "str") {
    return stdTypes.str;
  } else if (node.type == "num") {
    return stdTypes.num;
  } else if (node.type == "arr") {
    return stdTypes.arr;
  } else if (node.type == "obj") {
    return stdTypes.obj;
  } else if (node.type == "namedTypeSource") {
    return scope.getType(node.name) ?? stdTypes.any;
  } else if (node.type == "identifier") {
    return scope.getVariable(node.name) ?? stdTypes.any;
  } else if (node.type == "fn") {
    return {
      type: "functionType",
      args: Type.tuple(
        ...node.args.map((x) =>
          x.argType ? getType(x.argType, scope) : stdTypes.any
        )
      ),
      returnType: node.retType
        ? getType(node.retType, scope)
        : typeInferenceFromBlock(node.children, scope),
    };
  } else if (node.type == "call") {
    const fnType = getType(node.target, scope);
    if (fnType.type == "functionType") {
      return fnType.returnType;
    }
    return stdTypes.any;
  } else {
    return stdTypes.any;
  }
}

export function typeInferenceFromBlock(
  children: (Ast.Statement | Ast.Expression)[],
  scope: Scope
) {
  for (const node of children) {
    if (node.type == "return") {
      return getType(node, scope);
    }
  }
  return stdTypes.any;
}
