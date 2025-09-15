import type { FileInput, LocalErrors } from "../util/errors";
import type { LocalWarnings } from "../util/warnings";
/**
 * Builds a helper that gives type-safe arrays for a union type U.
 * 
 * const Subset = defineSubset<ModifierName>();
 * const arr = Subset(["STATIC", "ASYNC"]); 
 * // arr's type: readonly ["STATIC", "ASYNC"]
 */
export function defineSubset<U>() {
  return <
    const T extends readonly U[]
  >(values: T) => values;
}

export type HasDuplicates<T extends readonly any[]> =
  T extends [infer F, ...infer R]
    ? F extends R[number]
      ? true
      : HasDuplicates<R>
    : false;

/**
 * Builds a helper that gives type-safe Sets for a union type U.
 * 
 * const SetSubset = defineSetSubset<ModifierName>();
 * const set = SetSubset(["STATIC", "ASYNC"]);
 * // set's type: Set<"STATIC" | "ASYNC">
 */
export function defineSetSubset<U>() {
  return <
    const T extends readonly U[]
  >(values: T): Set<T[number]> => new Set(values);
}

export interface MainConfig {
  warn: LocalWarnings,
  errors: LocalErrors,
  file: FileInput
}

export interface BehaviourConfig { } // to-do