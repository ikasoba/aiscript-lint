import { Parser, Ast } from "@syuilo/aiscript";
import { AiType } from "./type.js";

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
  } else {
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
  str: { type: "primitiveTypeName", name: "str" },
  arr: { type: "primitiveTypeName", name: "arr" },
  obj: { type: "primitiveTypeName", name: "obj" },
  null: { type: "primitiveTypeName", name: "null" },
  any: { type: "primitiveTypeName", name: "any" },
} satisfies { [k: string]: AiType };

export const stdScope: Scope = new Scope(
  {
    "Core:add": {
      type: "functionType",
      args: [stdTypes.num, stdTypes.num],
      returnType: stdTypes.num,
    },
    "Core:sub": {
      type: "functionType",
      args: [stdTypes.num, stdTypes.num],
      returnType: stdTypes.num,
    },
    "Core:mul": {
      type: "functionType",
      args: [stdTypes.num, stdTypes.num],
      returnType: stdTypes.num,
    },
    "Core:div": {
      type: "functionType",
      args: [stdTypes.num, stdTypes.num],
      returnType: stdTypes.num,
    },
    "Core:pow": {
      type: "functionType",
      args: [stdTypes.num, stdTypes.num],
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

    if (!compareType(varType, exprType, scope)) {
      errors.push(
        new TypeError(
          `${toStringAiType(exprType)}は${toStringAiType(
            varType
          )}に代入できません`,
          node.loc!
        )
      );

      scope.setVariable(node.name, stdTypes.any);
    } else {
      scope.setVariable(node.name, varType);
    }
  } else if (node.type == "assign") {
    const varType = getType(node.dest, scope);
    const exprType = getType(node.expr, scope);
    errors.push(...typeCheck(node.expr, scope, parent));

    if (!compareType(varType, exprType, scope)) {
      errors.push(
        new TypeError(
          `${toStringAiType(exprType)}は${toStringAiType(
            varType
          )}に代入できません`,
          node.dest.loc!
        )
      );
    }
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
      if (functionType.args instanceof Array) {
        if (node.args.length != functionType.args.length) {
          errors.push(new TypeError(`引数の数が足りません`, node.loc!));
        }

        const args = functionType.args;
        const argTypes = node.args.map((x) => getType(x, scope));

        for (let i = 0; i < args.length && i < argTypes.length; i++) {
          errors.push(...typeCheck(node.args[i], scope, parent));
          if (!compareType(args[i], argTypes[i], scope)) {
            errors.push(
              new TypeError(
                `${toStringAiType(argTypes[i])}は${toStringAiType(
                  args[i]
                )}に代入できません`,
                node.args[i].loc!
              )
            );
          }
        }
      }
    }
  } else if (node.type == "addAssign" || node.type == "subAssign") {
    const targetType = getType(node.dest, scope);
    const valueType = getType(node.expr, scope);
    errors.push(...typeCheck(node.expr, scope, parent));

    if (!compareType(targetType, stdTypes.num, scope)) {
      errors.push(
        new TypeError(
          `${toStringAiType(targetType)}は${toStringAiType(
            stdTypes.num
          )}に代入できません`,
          node.dest.loc!
        )
      );
    }

    if (!compareType(valueType, stdTypes.num, scope)) {
      errors.push(
        new TypeError(
          `${toStringAiType(valueType)}は${toStringAiType(
            stdTypes.num
          )}に代入できません`,
          node.expr.loc!
        )
      );
    }
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
        if (!compareType(valueType, fn.returnType, scope)) {
          errors.push(
            new TypeError(
              `${toStringAiType(valueType)}は${toStringAiType(
                fn.returnType
              )}に代入できません`,
              x.loc!
            )
          );
        }
      }
    }
  }

  return errors;
}

export function compareType(x: AiType, y: AiType, scope: Scope): boolean {
  if (
    (x.type == "primitiveTypeName" && x.name == "any") ||
    (y.type == "primitiveTypeName" && y.name == "any")
  ) {
    return true;
  }

  if (x.type != y.type) {
    return false;
  }

  if (x.type == "functionType" && y.type == "functionType") {
    if (!compareType(x.returnType, y.returnType, scope)) {
      return false;
    }

    if (
      (!(x.args instanceof Array) && isAny(x.args)) ||
      (!(y.args instanceof Array) && isAny(y.args))
    ) {
      return true;
    }

    if (x.args instanceof Array && y.args instanceof Array) {
      if (x.args.length != y.args.length) {
        return false;
      }

      for (let i = 0; i < x.args.length; i++) {
        if (!compareType(x.args[i], y.args[i], scope)) {
          return false;
        }
      }

      return true;
    } else if (!(x.args instanceof Array) && !(y.args instanceof Array)) {
      return compareType(x.args, y.args, scope);
    } else {
      return false;
    }
  }

  if (x != y) {
    return false;
  }

  return true;
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
      args: node.args.map((x) =>
        x.argType ? getType(x.argType, scope) : stdTypes.any
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
