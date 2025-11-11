// main/config/types.ts

export type TypeKind = 'primitive' | 'class' | 'object' | 'special' | 'logical' | 'function';

// Abstract base class
export abstract class BaseType {
  abstract readonly kind: TypeKind;
  abstract readonly id?: string;
  readonly metadata: Record<string, unknown>;
  constructor(metadata: Record<string, unknown> = {}) {
    this.metadata = metadata;
  }
  abstract equals(other: BaseType): boolean;
}

// Primitive types
export class IntType extends BaseType {
  readonly kind = 'primitive';
  readonly id = 'int';
  constructor(value?: number) {
    super(value === undefined ? {} : { value });
  }
  equals(other: BaseType): boolean {
    return other instanceof IntType && this.metadata.value === other.metadata.value;
  }
}

export class FloatType extends BaseType {
  readonly kind = 'primitive';
  readonly id = 'float';
  constructor(value?: number) {
    super(value === undefined ? {} : { value });
  }
  equals(other: BaseType): boolean {
    return other instanceof FloatType && this.metadata.value === other.metadata.value;
  }
}

export class BooleanType extends BaseType {
  readonly kind = 'primitive';
  readonly id = 'boolean';
  constructor(value?: boolean) {
    super(value === undefined ? {} : { value });
  }
  equals(other: BaseType): boolean {
    return other instanceof BooleanType && this.metadata.value === other.metadata.value;
  }
}

export class StringType extends BaseType {
  readonly kind = 'primitive';
  readonly id = 'string';
  constructor(value?: string) {
    super(value === undefined ? {} : { value });
  }
  equals(other: BaseType): boolean {
    return other instanceof StringType && this.metadata.value === other.metadata.value;
  }
}

export class CharType extends BaseType {
  readonly kind = 'primitive';
  readonly id = 'char';
  constructor(value?: string) {
    super(value === undefined ? {} : { value });
  }
  equals(other: BaseType): boolean {
    return other instanceof CharType && this.metadata.value === other.metadata.value;
  }
}

export class VoidType extends BaseType {
  readonly kind = 'primitive';
  readonly id = 'void';
  constructor() { super({}); }
  equals(other: BaseType): boolean {
    return other instanceof VoidType;
  }
}

export class UndefinedType extends BaseType {
  readonly kind = 'primitive';
  readonly id = 'undefined';
  constructor() { super({}); }
  equals(other: BaseType): boolean {
    return other instanceof UndefinedType;
  }
}

export class NullType extends BaseType {
  readonly kind = 'primitive';
  readonly id = 'null';
  constructor() { super({}); }
  equals(other: BaseType): boolean {
    return other instanceof NullType;
  }
}

export class NaNType extends BaseType {
  readonly kind = 'primitive';
  readonly id = 'NaN';
  constructor() { super({}); }
  equals(other: BaseType): boolean {
    return other instanceof NaNType;
  }
}

// Reference/complex types
export class ArrayType extends BaseType {
  readonly kind = 'object';
  readonly id = 'array';
  constructor(public readonly elementType: BaseType) {
    super({ elementType });
  }
  equals(other: BaseType): boolean {
    return other instanceof ArrayType && this.elementType.equals(other.elementType);
  }
}

export class StructType extends BaseType {
  readonly kind = 'object';
  readonly id = 'struct';
  constructor(
    public readonly elementTypes: Map<string, BaseType>,
    public readonly generics: BaseType[] = []
  ) {
    super({ elementTypes, generics });
  }
  equals(other: BaseType): boolean {
    if (!(other instanceof StructType)) return false;
    if (this.generics.length !== other.generics.length) return false;
    // Simplified: actual field-by-field comparison could be added
    return true;
  }
}

export class ClassType extends BaseType {
  readonly kind = 'class';
  constructor(
    public readonly id: string,
    public readonly metadata: { extending?: ClassType; implementing?: StructType; generics?: BaseType[] } = {}
  ) { super(metadata); }
  equals(other: BaseType): boolean {
    return other instanceof ClassType && this.id === other.id;
  }
}

export class FunctionType extends BaseType {
  readonly kind = 'function';
  readonly id = 'function';
  constructor(
    public readonly params: BaseType[],
    public readonly returnType: BaseType | VoidType,
    public readonly generics: BaseType[] = []
  ) {
    super({ params, returnType, generics });
  }
  equals(other: BaseType): boolean {
    return (
      other instanceof FunctionType &&
      other.params.length === this.params.length &&
      other.params.every((t, i) => this.params[i].equals(t)) &&
      (this.returnType === null || other.returnType === null
        ? this.returnType === other.returnType
        : this.returnType.equals(other.returnType))
    );
  }
}

// Type logic
export class TypeUnion extends BaseType {
  readonly kind = 'logical';
  readonly id = 'union';
  constructor(public readonly left: BaseType, public readonly right: BaseType) {
    super({ left, right });
  }
  equals(other: BaseType): boolean {
    return (
      other instanceof TypeUnion &&
      this.left.equals(other.left) &&
      this.right.equals(other.right)
    );
  }
}

export class TypeIntersection extends BaseType {
  readonly kind = 'logical';
  readonly id = 'intersection';
  constructor(public readonly left: BaseType, public readonly right: BaseType) {
    super({ left, right });
  }
  equals(other: BaseType): boolean {
    return (
      other instanceof TypeIntersection &&
      this.left.equals(other.left) &&
      this.right.equals(other.right)
    );
  }
}

export const TypeClasses = {
  int: IntType,
  float: FloatType,
  boolean: BooleanType,
  string: StringType,
  char: CharType,
  void: VoidType,
  undefined: UndefinedType,
  null: NullType,
  NaN: NaNType,
  array: ArrayType,
  struct: StructType,
  class: ClassType,
  function: FunctionType,
  union: TypeUnion,
  intersection: TypeIntersection
} as const;

// Registry and type-indexed reference for import
export const Types = {
  int: new IntType(),
  float: new FloatType(),
  boolean: new BooleanType(),
  string: new StringType(),
  char: new CharType(),
  void: new VoidType(),
  undefined: new UndefinedType(),
  null: new NullType(),
  NaN: new NaNType(),
} as const;

// Helper mapped type to statically reference all types, e.g. Types["int"]
export type TypesMap = typeof Types;
