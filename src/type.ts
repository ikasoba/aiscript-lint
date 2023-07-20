export interface AiPrimitiveTypeName {
  type: "primitiveTypeName";
  name: string;
  args?: AiType[];
}

export interface AiFunctionType {
  type: "functionType";
  args: AiType[] | AiType;
  returnType: AiType;
}

export interface AiTypeDefinition {
  args: string[];
  type: AiType | ((...args: string[]) => AiType);
}

export type AiType = AiPrimitiveTypeName | AiFunctionType;
