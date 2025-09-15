import { defineSetSubset, defineSubset } from '../types/global';
import { BitFlag } from '../util/bitflag';

export const ModifierFlags = {
    PUBLIC: 1 << 0,
    PRIVATE: 1 << 1,
    PROTECTED: 1 << 2,
    DEFAULT: 1 << 3,
    STATIC: 1 << 4,
    ASYNC: 1 << 5,
    FINAL: 1 << 6,
    READONLY: 1 << 7,
};

export type ModifierName = keyof typeof ModifierFlags;

export const ModifierSetSubset = defineSetSubset<ModifierName>(); 

export const accessModifiers = ModifierSetSubset([
    "PUBLIC", "PRIVATE", "PROTECTED", "DEFAULT"
]);

export const behaviorModifiers = ModifierSetSubset([
    "STATIC", "ASYNC"
])

export const immutabilityModifiers = ModifierSetSubset([
    "FINAL", "READONLY"
])

export const allModifiers: Set<ModifierName> = new Set(
    Object.keys(ModifierFlags) as ModifierName[]
);

export const Modifiers = BitFlag.fromExplicit(ModifierFlags, true);
// CLONE EVERY TIME BEFORE CREATING NEW MODIFIERS FLAG -> Modifiers.clone();
// parse order: access → behavior → immutability → async/abstract