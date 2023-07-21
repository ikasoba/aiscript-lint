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
};
