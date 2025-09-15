export function isPowerOfTwo(n: number | bigint): boolean {
  if (typeof n === 'bigint') {
    return n > 0n && (n & (n - 1n)) === 0n;
  }
  return n > 0 && (n & (n - 1)) === 0;
}

export type ExplicitFlags = Record<string, number | bigint>;

const MAX_SAFE_FLAGS = 53;
const RECOMMENDED_MAX_FLAGS = 32;

export class BitFlag<T extends string = string> {
  private flags: Map<string, number | bigint> = new Map();
  private value: number | bigint = 0;
  private useBigInt: boolean = false;

  private constructor(flagsMap: Map<string, number | bigint>, useBigInt: boolean = false) {
    this.validateFlagCount(flagsMap.size);
    this.flags = flagsMap;
    this.useBigInt = useBigInt;
    this.value = useBigInt ? 0n : 0;
  }

  private validateFlagCount(count: number): void {
    if (count > MAX_SAFE_FLAGS) {
      throw new Error(
        `Too many flags (${count}). Maximum supported: ${MAX_SAFE_FLAGS}.\n` +
        `For large permission sets (${count}+ flags), consider:\n` +
        `• Grouping permissions into categories (e.g., user permissions, admin permissions)\n` +
        `• Using a Set<string> for permission names instead of bit flags\n` +
        `• Implementing hierarchical permissions\n` +
        `• Using database-backed permission checks for rarely-used permissions`
      );
    }
    
    if (count > RECOMMENDED_MAX_FLAGS) {
      console.warn(
        `Warning: ${count} flags exceeds recommended limit of ${RECOMMENDED_MAX_FLAGS}.\n` +
        `Consider grouping permissions or using alternative data structures for better performance.`
      );
    }
  }

  set(flag: T): BitFlag<T> {
    const flagValue = this.flags.get(flag);
    if (flagValue !== undefined) {
      if (this.useBigInt) {
        this.value = (this.value as bigint) | (flagValue as bigint);
      } else {
        this.value = (this.value as number) | (flagValue as number);
      }
    }
    return this;
  }

  setMultiple(...flags: T[]): BitFlag<T> {
    flags.forEach(flag => this.set(flag));
    return this;
  }

  unset(flag: T): BitFlag<T> {
    const flagValue = this.flags.get(flag);
    if (flagValue !== undefined) {
      if (this.useBigInt) {
        this.value = (this.value as bigint) & ~(flagValue as bigint);
      } else {
        this.value = (this.value as number) & ~(flagValue as number);
      }
    }
    return this;
  }

  unsetMultiple(...flags: T[]): BitFlag<T> {
    flags.forEach(flag => this.unset(flag));
    return this;
  }

  toggle(flag: T): BitFlag<T> {
    const flagValue = this.flags.get(flag);
    if (flagValue !== undefined) {
      if (this.useBigInt) {
        this.value = (this.value as bigint) ^ (flagValue as bigint);
      } else {
        this.value = (this.value as number) ^ (flagValue as number);
      }
    }
    return this;
  }

  toggleMultiple(...flags: T[]): BitFlag<T> {
    flags.forEach(flag => this.toggle(flag));
    return this;
  }

  has(flag: T): boolean {
    const flagValue = this.flags.get(flag);
    if (flagValue === undefined) return false;
    if (this.useBigInt) {
      return ((this.value as bigint) & (flagValue as bigint)) === (flagValue as bigint);
    }
    return ((this.value as number) & (flagValue as number)) === (flagValue as number);
  }

  hasAny(...flags: T[]): boolean {
    return flags.some(flag => this.has(flag));
  }

  hasAnySet(flags: Set<T>): boolean {
    for (const flag of this.flags.keys()) {
      if (flags.has(flag as T) && this.has(flag as T)) {
        return true;
      }
    }
    return false;
  }

  hasAll(...flags: T[]): boolean {
    return flags.every(flag => this.has(flag));
  }

  hasNone(...flags: T[]): boolean {
    return !this.hasAny(...flags);
  }

  clear(): BitFlag<T> {
    this.value = this.useBigInt ? 0n : 0;
    return this;
  }

  setAll(): BitFlag<T> {
    this.flags.forEach((flagValue) => {
      if (this.useBigInt) {
        this.value = (this.value as bigint) | (flagValue as bigint);
      } else {
        this.value = (this.value as number) | (flagValue as number);
      }
    });
    return this;
  }

  getValue(): number | bigint {
    return this.value;
  }

  getNumberValue(): number {
    if(this.useBigInt) throw new Error("Cannot get number value from big int flag");
    return this.value as number;
  }

  getBigIntValue(): bigint {
    if(!this.useBigInt) throw new Error("Cannot get big int value from number flag");
    return this.value as bigint;
  }

  setValue(value: number | bigint): BitFlag<T> {
    this.value = value;
    return this;
  }

  getActiveFlags(): string[] {
    const activeFlags: string[] = [];
    this.flags.forEach((flagValue, flagName) => {
      const isActive = this.useBigInt 
        ? ((this.value as bigint) & (flagValue as bigint)) === (flagValue as bigint)
        : ((this.value as number) & (flagValue as number)) === (flagValue as number);
      if (isActive) {
        activeFlags.push(flagName);
      }
    });
    return activeFlags;
  }

  getInactiveFlags(): string[] {
    const inactiveFlags: string[] = [];
    this.flags.forEach((flagValue, flagName) => {
      const isActive = this.useBigInt 
        ? ((this.value as bigint) & (flagValue as bigint)) === (flagValue as bigint)
        : ((this.value as number) & (flagValue as number)) === (flagValue as number);
      if (!isActive) {
        inactiveFlags.push(flagName);
      }
    });
    return inactiveFlags;
  }

  getAllFlags(): string[] {
    return Array.from(this.flags.keys());
  }

  getFlagValue(flag: T): number | bigint | undefined {
    return this.flags.get(flag);
  }

  count(): number {
    let count = 0;
    if (this.useBigInt) {
      let value = this.value as bigint;
      while (value > 0n) {
        count += Number(value & 1n);
        value >>= 1n;
      }
    } else {
      let value = this.value as number;
      while (value) {
        count += value & 1;
        value >>>= 1;
      }
    }
    return count;
  }

  isEmpty(): boolean {
    return this.value === 0;
  }

  isFull(): boolean {
    if (this.useBigInt) {
      let allFlags = 0n;
      this.flags.forEach((flagValue) => {
        allFlags |= flagValue as bigint;
      });
      return this.value === allFlags;
    } else {
      let allFlags = 0;
      this.flags.forEach((flagValue) => {
        allFlags |= flagValue as number;
      });
      return this.value === allFlags;
    }
  }

  intersect(other: BitFlag<T>): BitFlag<T> {
    const result = new BitFlag<T>(new Map(this.flags), this.useBigInt);
    if (this.useBigInt) {
      result.value = (this.value as bigint) & (other.value as bigint);
    } else {
      result.value = (this.value as number) & (other.value as number);
    }
    return result;
  }

  union(other: BitFlag<T>): BitFlag<T> {
    const result = new BitFlag<T>(new Map(this.flags), this.useBigInt);
    if (this.useBigInt) {
      result.value = (this.value as bigint) | (other.value as bigint);
    } else {
      result.value = (this.value as number) | (other.value as number);
    }
    return result;
  }

  difference(other: BitFlag<T>): BitFlag<T> {
    const result = new BitFlag<T>(new Map(this.flags), this.useBigInt);
    if (this.useBigInt) {
      result.value = (this.value as bigint) & ~(other.value as bigint);
    } else {
      result.value = (this.value as number) & ~(other.value as number);
    }
    return result;
  }

  symmetricDifference(other: BitFlag<T>): BitFlag<T> {
    const result = new BitFlag<T>(new Map(this.flags), this.useBigInt);
    if (this.useBigInt) {
      result.value = (this.value as bigint) ^ (other.value as bigint);
    } else {
      result.value = (this.value as number) ^ (other.value as number);
    }
    return result;
  }

  equals(other: BitFlag<T>): boolean {
    return this.value === other.value;
  }

  clone(): BitFlag<T> {
    const clone = new BitFlag<T>(new Map(this.flags), this.useBigInt);
    clone.value = this.value;
    return clone;
  }

  toString(): string {
    const activeFlags = this.getActiveFlags();
    const valueStr = this.useBigInt ? `${this.value}n` : `${this.value}`;
    return `BitFlag(${activeFlags.join(', ')}) [${valueStr}]`;
  }

  toJSON(): object {
    return {
      value: this.value,
      activeFlags: this.getActiveFlags(),
      allFlags: this.getAllFlags()
    };
  }

  static fromValue<T extends readonly string[]>(flags: T, value: number | bigint): BitFlag<T[number]> {
    if (flags.length > MAX_SAFE_FLAGS) {
      throw new Error(
        `Too many flags (${flags.length}). Maximum supported: ${MAX_SAFE_FLAGS}.\n` +
        `For large permission sets (${flags.length}+ flags), consider:\n` +
        `• Grouping permissions into categories\n` +
        `• Using Set<string> for permission names instead of bit flags\n` +
        `• Implementing hierarchical permissions\n` +
        `• Using database-backed permission checks for rarely-used permissions`
      );
    }
    
    const useBigInt = typeof value === 'bigint' || flags.length > RECOMMENDED_MAX_FLAGS;
    const flagsMap = new Map<string, number | bigint>();
    
    flags.forEach((flag, index) => {
      if (useBigInt) {
        flagsMap.set(flag, 1n << BigInt(index));
      } else {
        flagsMap.set(flag, 1 << index);
      }
    });
    
    const bitFlag = new BitFlag<T[number]>(flagsMap, useBigInt);
    bitFlag.setValue(value);
    return bitFlag;
  }

  static combine<T extends string>(...bitFlags: BitFlag<T>[]): BitFlag<T> {
    if (bitFlags.length === 0) {
      return new BitFlag<T>(new Map());
    }
    
    if (bitFlags.length > 1000) {
      throw new Error(`Too many BitFlag instances to combine (${bitFlags.length}). Maximum: 1000`);
    }

    const result = bitFlags[0].clone();
    for (let i = 1; i < bitFlags.length; i++) {
      if (result.useBigInt) {
        result.value = (result.value as bigint) | (bitFlags[i].value as bigint);
      } else {
        result.value = (result.value as number) | (bitFlags[i].value as number);
      }
    }
    return result;
  }

  static fromArray<T extends readonly string[]>(flags: T): BitFlag<T[number]> {
    if (flags.length > MAX_SAFE_FLAGS) {
      throw new Error(
        `Too many flags (${flags.length}). Maximum supported: ${MAX_SAFE_FLAGS}.\n` +
        `For large permission sets (${flags.length}+ flags), consider:\n` +
        `• Grouping permissions into categories\n` +
        `• Using Set<string> for permission names instead of bit flags\n` +
        `• Implementing hierarchical permissions\n` +
        `• Using database-backed permission checks for rarely-used permissions`
      );
    }
    
    const useBigInt = flags.length > RECOMMENDED_MAX_FLAGS;
    const flagsMap = new Map<string, number | bigint>();
    
    flags.forEach((flag, index) => {
      if (useBigInt) {
        flagsMap.set(flag, 1n << BigInt(index));
      } else {
        flagsMap.set(flag, 1 << index);
      }
    });
    
    return new BitFlag<T[number]>(flagsMap, useBigInt);
  }

  static fromExplicit<T extends Record<string, number | bigint>>(flags: T, strict: boolean = true): BitFlag<keyof T & string> {
    const flagCount = Object.keys(flags).length;
    const flagValues = Object.values(flags);
    
    if (flagCount > MAX_SAFE_FLAGS) {
      throw new Error(
        `Too many flags (${flagCount}). Maximum supported: ${MAX_SAFE_FLAGS}.\n` +
        `For large permission sets (${flagCount}+ flags), consider:\n` +
        `• Grouping permissions into categories\n` +
        `• Using Set<string> for permission names instead of bit flags\n` +
        `• Implementing hierarchical permissions\n` +
        `• Using database-backed permission checks for rarely-used permissions`
      );
    }
    
    if (strict) {
      let maxValue = 0;
      
      for (const val of flagValues) {
        if (typeof val === 'bigint') {
          if (val > BigInt(Number.MAX_SAFE_INTEGER)) {
            throw new Error(
              `Flag value ${val} exceeds safe bit position limit.\n` +
              `Maximum safe flag value: 4503599627370496 (bit position ${MAX_SAFE_FLAGS - 1})`
            );
          }
          maxValue = Math.max(maxValue, Number(val));
        } else {
          maxValue = Math.max(maxValue, val);
        }
      }
      
      if (maxValue >= 9007199254740992) {
        throw new Error(
          `Flag value ${maxValue} exceeds safe bit position limit.\n` +
          `Maximum safe flag value: 4503599627370496 (bit position ${MAX_SAFE_FLAGS - 1})`
        );
      }
    }
    
    const useBigInt = flagValues.some(v => typeof v === 'bigint') || flagCount > RECOMMENDED_MAX_FLAGS;
    const flagsMap = new Map<string, number | bigint>();
    
    if(strict) {
      Object.entries(flags).forEach(([key, value]) => {
        if(!isPowerOfTwo(value)) throw new Error(`Flag value ${value} is not a valid power of two`);
        flagsMap.set(key, value);
      });
    } else {
      Object.entries(flags).forEach(([key, value]) => {
        flagsMap.set(key, value);
      });
    }
    return new BitFlag<keyof T & string>(flagsMap, useBigInt);
  }

  static from<T extends Record<number, string>>(idToFlag: T): BitFlag<T[keyof T] & string> {
    const keys = Object.keys(idToFlag);
    if (keys.length > 10000) {
      throw new Error(`Object too large (${keys.length} entries). Maximum: 10000`);
    }
    
    const ids = keys.map(id => parseInt(id));
    const maxId = Math.max(...ids);
    const minId = Math.min(...ids);
    
    if (minId < 1) {
      throw new Error(`Invalid ID ${minId}. IDs must start from 1.`);
    }
    
    if (maxId > MAX_SAFE_FLAGS) {
      throw new Error(
        `Maximum ID (${maxId}) exceeds safe limit (${MAX_SAFE_FLAGS}).\n` +
        `For large ID ranges, consider:\n` +
        `• Using contiguous IDs starting from 1\n` +
        `• Implementing ID mapping/compression\n` +
        `• Using Set<string> for sparse permission sets\n` +
        `• Grouping permissions into smaller BitFlag instances`
      );
    }
    
    const useBigInt = maxId > RECOMMENDED_MAX_FLAGS;
    const flagsMap = new Map<string, number | bigint>();
    
    Object.entries(idToFlag).forEach(([id, flagName]) => {
      const bitPosition = parseInt(id) - 1;
      if (useBigInt) {
        flagsMap.set(flagName, 1n << BigInt(bitPosition));
      } else {
        flagsMap.set(flagName, 1 << bitPosition);
      }
    });
    
    return new BitFlag<T[keyof T] & string>(flagsMap, useBigInt);
  }
}