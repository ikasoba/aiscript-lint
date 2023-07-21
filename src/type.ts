import { Scope } from "./Scope.js";

export interface AiPrimitiveTypeName {
  type: "primitiveTypeName";
  name: string;
}

export type AiTypeFunctionNative = {
  args: AiType;
  fn: (...args: AiType[]) => AiType;
};
export interface AiFunctionType {
  type: "functionType";
  args: AiType;
  returnType: AiType;
}

export interface AiUnionType {
  type: "unionType";
  children: AiType[];
}

export interface AiInvokeTypeFunction {
  type: "invokeTypeFunction";
  expr: AiPrimitiveTypeName;
  args: AiType[];
}

export interface AiTupleType {
  type: "tupleType";
  children: AiType[];
}

export interface AiTypeDefinition {
  args: string[];
  type: AiType | ((...args: string[]) => AiType);
}

export type AiType =
  | AiPrimitiveTypeName
  | AiFunctionType
  | AiUnionType
  | AiTupleType;

export const Type = {
  tuple(...children: AiType[]): AiTupleType {
    return {
      type: "tupleType",
      children,
    };
  },
  union(...children: AiType[]): AiUnionType {
    return {
      type: "unionType",
      children,
    };
  },
  fn(args: AiType, returnType: AiType): AiFunctionType {
    return {
      type: "functionType",
      args,
      returnType,
    };
  },
};

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
