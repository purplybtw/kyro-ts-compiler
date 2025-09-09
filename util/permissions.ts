export interface PermissionDefinition {
  readonly name: string;
  readonly description?: string;
}

export interface CategorySchema {
  readonly [key: string]: PermissionDefinition;
}

export interface PermissionSchema {
  readonly [categoryName: string]: CategorySchema;
}

export interface CategoryPermissions {
  readonly [categoryName: string]: readonly string[];
}

export interface AccessCheckResult {
  readonly granted: boolean;
  readonly missing?: CategoryPermissions;
}

export interface TypedRole<T extends PermissionSchema> {
  readonly name: string;
  readonly description?: string;
  readonly permissions: CategoryPermissions;
}

type ExtractPermissionNames<T extends CategorySchema> = {
  readonly [K in keyof T]: T[K]['name']
}[keyof T];

type ExtractCategoryNames<T extends PermissionSchema> = keyof T;

type ExtractPermissionsByCategory<T extends PermissionSchema> = {
  readonly [K in keyof T]: ExtractPermissionNames<T[K]>
};

export type TypedPermissionSchema<T extends PermissionSchema> = {
  schema: T;
  categories: Array<ExtractCategoryNames<T>>;
  getPermissions: <K extends ExtractCategoryNames<T>>(category: K) => Array<ExtractPermissionNames<T[K]>>;
  getAllPermissions: () => ExtractPermissionsByCategory<T>;
};

export class PermissionSchema {
  static create<T extends PermissionSchema>(schema: T): TypedPermissionSchema<T> {
    return {
      schema,
      categories: Object.keys(schema) as Array<ExtractCategoryNames<T>>,
      getPermissions: <K extends ExtractCategoryNames<T>>(category: K): Array<ExtractPermissionNames<T[K]>> => {
        return Object.values(schema[category]).map(p => p.name) as Array<ExtractPermissionNames<T[K]>>;
      },
      getAllPermissions: (): ExtractPermissionsByCategory<T> => {
        const result = {} as any;
        Object.entries(schema).forEach(([category, permissions]) => {
          result[category] = Object.values(permissions).map(p => p.name);
        });
        return result;
      }
    };
  }
}

export class PermissionManager<T extends PermissionSchema> {
  private permissions: Map<string, Set<string>> = new Map();

  constructor(private schema: TypedPermissionSchema<T>) {}

  hasPermission<K extends keyof T>(
    category: K,
    permission: T[K][keyof T[K]]['name']
  ): boolean {
    const categoryPerms = this.permissions.get(category as string);
    return categoryPerms?.has(permission) ?? false;
  }

  checkAccess(
    request: {
      readonly [C in keyof T]?: readonly (T[C][keyof T[C]]['name'])[]
    }
  ): AccessCheckResult {
    const missing: Record<string, string[]> = {};
    let hasAnyMissing = false;

    Object.entries(request).forEach(([category, perms]) => {
      const categoryPerms = this.permissions.get(category);
      const missingInCategory: string[] = [];

      (perms as string[]).forEach(perm => {
        if (!categoryPerms?.has(perm)) {
          missingInCategory.push(perm);
          hasAnyMissing = true;
        }
      });

      if (missingInCategory.length > 0) {
        missing[category] = missingInCategory;
      }
    });

    return {
      granted: !hasAnyMissing,
      missing: hasAnyMissing ? missing : undefined
    };
  }

  mergePermissions(permissions: CategoryPermissions): this {
    Object.entries(permissions).forEach(([category, perms]) => {
      if (!this.permissions.has(category)) {
        this.permissions.set(category, new Set());
      }
      const categorySet = this.permissions.get(category)!;
      perms.forEach(perm => categorySet.add(perm));
    });
    return this;
  }

  getAllActivePermissions(): CategoryPermissions {
    const result: Record<string, string[]> = {};
    this.permissions.forEach((perms, category) => {
      result[category] = Array.from(perms);
    });
    return result;
  }

  getSerializableData(): Record<string, number> {
    const result: Record<string, number> = {};

    this.permissions.forEach((perms, category) => {
      const categorySchema = this.schema.schema[category];
      if (categorySchema) {
        let value = 0;
        Object.entries(categorySchema).forEach(([id, permDef]) => {
          if (perms.has(permDef.name)) {
            value |= (1 << (parseInt(id) - 1));
          }
        });
        if (value > 0) {
          result[category] = value;
        }
      }
    });

    return result;
  }

  static fromSerializableData<T extends PermissionSchema>(
    schema: TypedPermissionSchema<T>,
    data: Record<string, number>
  ): PermissionManager<T> {
    const manager = new PermissionManager(schema);

    Object.entries(data).forEach(([category, value]) => {
      const categorySchema = schema.schema[category];
      if (categorySchema) {
        const perms: string[] = [];
        Object.entries(categorySchema).forEach(([id, permDef]) => {
          if (value & (1 << (parseInt(id) - 1))) {
            perms.push(permDef.name);
          }
        });
        if (perms.length > 0) {
          manager.mergePermissions({ [category]: perms });
        }
      }
    });

    return manager;
  }
}

export class RoleBuilder<T extends PermissionSchema> {
  private permissions: Record<string, string[]> = {};

  constructor(
    private schema: TypedPermissionSchema<T>,
    private name: string,
    private description?: string
  ) {}

  with<K extends keyof T>(
    category: K,
    ...permissions: Array<T[K][keyof T[K]]['name']>
  ): this {
    const categoryStr = category as string;
    if (!this.permissions[categoryStr]) {
      this.permissions[categoryStr] = [];
    }

    permissions.forEach(perm => {
      if (!this.permissions[categoryStr].includes(perm)) {
        this.permissions[categoryStr].push(perm);
      }
    });

    return this;
  }

  withAll<K extends keyof T>(category: K): this {
    const categoryStr = category as string;
    const allPerms = this.schema.getPermissions(category);
    return this.with(category, ...(allPerms as any));
  }

  removePermission<K extends keyof T>(
    category: K,
    permission: T[K][keyof T[K]]['name']
  ): this {
    const categoryStr = category as string;
    if (this.permissions[categoryStr]) {
      this.permissions[categoryStr] = this.permissions[categoryStr]
        .filter(p => p !== permission);

      if (this.permissions[categoryStr].length === 0) {
        delete this.permissions[categoryStr];
      }
    }
    return this;
  }

  build(): TypedRole<T> {
    return {
      name: this.name,
      description: this.description,
      permissions: JSON.parse(JSON.stringify(this.permissions))
    };
  }

  buildPermissions(): CategoryPermissions {
    return JSON.parse(JSON.stringify(this.permissions));
  }

  static create<T extends PermissionSchema>(
    schema: TypedPermissionSchema<T>,
    name: string,
    description?: string
  ): RoleBuilder<T> {
    return new RoleBuilder(schema, name, description);
  }
}

export class RoleRegistry<T extends PermissionSchema> {
  private roles: Map<string, TypedRole<T>> = new Map();

  constructor(private schema: TypedPermissionSchema<T>) {}

  register(role: TypedRole<T>): this {
    this.roles.set(role.name, role);
    return this;
  }

  get(name: string): TypedRole<T> | undefined {
    return this.roles.get(name);
  }

  getPermissions(name: string): CategoryPermissions | undefined {
    const role = this.roles.get(name);
    return role?.permissions;
  }

  createBuilder(name: string, description?: string): RoleBuilder<T> {
    return RoleBuilder.create(this.schema, name, description);
  }

  listNames(): string[] {
    return Array.from(this.roles.keys());
  }

  static create<T extends PermissionSchema>(
    schema: TypedPermissionSchema<T>
  ): RoleRegistry<T> {
    return new RoleRegistry(schema);
  }
}