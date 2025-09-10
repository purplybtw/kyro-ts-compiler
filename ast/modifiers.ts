import { BitFlag } from '../util/bitflag';

export const ModifierFlags = {
    PUBLIC: 1 << 0,
    PRIVATE: 1 << 1,
    PROTECTED: 1 << 2,
    STATIC: 1 << 3,
    FINAL: 1 << 4,
    READONLY: 1 << 5,
}

export const Modifiers = BitFlag.fromExplicit(ModifierFlags, true);
// CLONE EVERY TIME BEFORE CREATING NEW MODIFIERS FLAG -> Modifiers.clone();
// parse order: access → behavior → immutability → async/abstract