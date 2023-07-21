import { Parser, Ast } from "@syuilo/aiscript";
import { AiType, Type, stdTypes } from "./type.js";
import { Scope } from "./Scope.js";

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
    return "<unknown>";
  }
}

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
      errors.push(...node.args.flatMap((arg) => typeCheck(arg, scope, parent)));

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

    for (let i = 0; i < x.children.length && i < y.children.length; i++) {
      errors.push(...compareType(x.children[i], y.children[i], scope));
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
