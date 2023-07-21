import { AiType } from "./type.js";

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
