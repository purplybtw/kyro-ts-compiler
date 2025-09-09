export interface OperationRequirements {
  readonly [category: string]: readonly string[];
}

export interface Operation {
  readonly name: string;
  readonly description?: string;
  readonly requirements: OperationRequirements;
  readonly metadata?: Record<string, any>;
}

export class OperationBuilder<T extends PermissionSchema> {
  private constructor(
    private schema: TypedPermissionSchema<T>,
    private name: string,
    private description?: string,
    private requirements: OperationRequirements = {},
    private metadata: Record<string, any> = {}
  ) {}

  static create<T extends PermissionSchema>(
    schema: TypedPermissionSchema<T>,
    name: string,
    description?: string
  ): OperationBuilder<T> {
    return new OperationBuilder(schema, name, description);
  }

  static fromSchema<T extends PermissionSchema>(
    schema: TypedPermissionSchema<T>,
    operation: {
      name: string;
      description?: string;
      requirements: OperationRequirements;
      metadata?: Record<string, any>;
    }
  ): Operation {
    return {
      name: operation.name,
      description: operation.description,
      requirements: this.makeImmutable(operation.requirements as any),
      metadata: operation.metadata ? { ...operation.metadata } : undefined
    };
  }

  static createMultiple<T extends PermissionSchema>(
    schema: TypedPermissionSchema<T>,
    operations: Array<{
      name: string;
      description?: string;
      requirements: OperationRequirements;
      metadata?: Record<string, any>;
    }>
  ): readonly Operation[] {
    return operations.map(op => this.fromSchema(schema, op));
  }

  requires<K extends keyof T>(
    category: K,
    ...permissions: Array<T[K][keyof T[K]]['name']>
  ): OperationBuilder<T> {
    const categoryStr = category as string;
    const existingPerms = this.requirements[categoryStr] || [];
    const newPerms = [...existingPerms, ...permissions];

    return new OperationBuilder(
      this.schema,
      this.name,
      this.description,
      {
        ...this.requirements,
        [categoryStr]: Object.freeze([...new Set(newPerms)])
      },
      this.metadata
    );
  }

  withMetadata(key: string, value: any): OperationBuilder<T> {
    return new OperationBuilder(
      this.schema,
      this.name,
      this.description,
      this.requirements,
      { ...this.metadata, [key]: value }
    );
  }

  build(): Operation {
    return {
      name: this.name,
      description: this.description,
      requirements: OperationBuilder.makeImmutable(this.requirements),
      metadata: Object.keys(this.metadata).length > 0 ? { ...this.metadata } : undefined
    };
  }

  private static makeImmutable(requirements: OperationRequirements): OperationRequirements {
    const immutable: Record<string, readonly string[]> = {};
    Object.entries(requirements).forEach(([category, perms]) => {
      immutable[category] = Object.freeze([...perms]);
    });
    return Object.freeze(immutable);
  }

  canExecute(permissionManager: PermissionManager<T>): {
    granted: boolean;
    missing?: OperationRequirements;
  } {
    return permissionManager.checkAccess(this.requirements as any );
  }
}

import { PermissionSchema, TypedPermissionSchema, PermissionManager } from './permissions';