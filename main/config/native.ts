import { Modifiers } from "../../ast/modifiers";
import type { SymbolEntry } from "./symbols";
import { TypeClasses, Types } from "./types";

const nativeConfig = {
    console: {
        print: {
            kind: "function",
            params: [{ name: "v", type: Types.string, loc: undefined }],
            isAsync: false,
            name: "print",
            modifiers: Modifiers.getNumberValueOf(["PUBLIC", "STATIC"]),
            type: new TypeClasses.function([Types.string], Types.void, []),
            loc: undefined,
            node: undefined
        } as SymbolEntry,
        println: {
            kind: "function",
            params: [{ name: "v", type: Types.string, loc: undefined }],
            isAsync: false,
            name: "println",
            modifiers: Modifiers.getNumberValueOf(["PUBLIC", "STATIC"]),
            type: new TypeClasses.function([Types.string], Types.void, []),
            loc: undefined,
            node: undefined
        } as SymbolEntry,
        input: {
            kind: "function",
            params: [{ name: "prompt", type: Types.string, loc: undefined }],
            isAsync: false,
            name: "input",
            modifiers: Modifiers.getNumberValueOf(["PUBLIC", "STATIC"]),
            type: new TypeClasses.function([Types.string], Types.string, []),
            loc: undefined,
            node: undefined
        } as SymbolEntry,
        exit: {
            kind: "function",
            params: [],
            isAsync: false,
            name: "exit",
            modifiers: Modifiers.getNumberValueOf(["PUBLIC", "STATIC"]),
            type: new TypeClasses.function([], Types.void, []),
            loc: undefined,
            node: undefined
        } as SymbolEntry,
        error: {
            kind: "function",
            params: [{ name: "message", type: Types.string, loc: undefined }],
            isAsync: false,
            name: "error",
            modifiers: Modifiers.getNumberValueOf(["PUBLIC", "STATIC"]),
            type: new TypeClasses.function([Types.string], Types.void, []),
            loc: undefined,
            node: undefined
        } as SymbolEntry,
    } as const,

    env: {
        get: {
            kind: "function",
            params: [{ name: "key", type: Types.string, loc: undefined }],
            isAsync: false,
            name: "get",
            modifiers: Modifiers.getNumberValueOf(["PUBLIC", "STATIC"]),
            type: new TypeClasses.function([Types.string], Types.string, []),
            loc: undefined,
            node: undefined
        } as SymbolEntry,
    },

    file: {
        read: {
            kind: "function",
            params: [{ name: "path", type: Types.string, loc: undefined }],
            isAsync: false,
            name: "read",
            modifiers: Modifiers.getNumberValueOf(["PUBLIC", "STATIC"]),
            type: new TypeClasses.function([Types.string], Types.string, []),
            loc: undefined,
            node: undefined
        } as SymbolEntry,
        write: {
            kind: "function",
            params: [{ name: "path", type: Types.string, loc: undefined }, { name: "content", type: Types.string, loc: undefined }],
            isAsync: false,
            name: "write",
            modifiers: Modifiers.getNumberValueOf(["PUBLIC", "STATIC"]),
            type: new TypeClasses.function([Types.string, Types.string], Types.void, []),
            loc: undefined,
            node: undefined
        } as SymbolEntry,
        append: {
            kind: "function",
            params: [{ name: "path", type: Types.string, loc: undefined }, { name: "content", type: Types.string, loc: undefined }],
            isAsync: false,
            name: "append",
            modifiers: Modifiers.getNumberValueOf(["PUBLIC", "STATIC"]),
            type: new TypeClasses.function([Types.string, Types.string], Types.void, []),
            loc: undefined,
            node: undefined
        } as SymbolEntry,
        exists: {
            kind: "function",
            params: [{ name: "path", type: Types.string, loc: undefined }],
            isAsync: false,
            name: "exists",
            modifiers: Modifiers.getNumberValueOf(["PUBLIC", "STATIC"]),
            type: new TypeClasses.function([Types.string], Types.boolean, []),
            loc: undefined,
            node: undefined
        } as SymbolEntry,
        delete: {
            kind: "function",
            params: [{ name: "path", type: Types.string, loc: undefined }],
            isAsync: false,
            name: "delete",
            modifiers: Modifiers.getNumberValueOf(["PUBLIC", "STATIC"]),
            type: new TypeClasses.function([Types.string], Types.void, []),
            loc: undefined,
            node: undefined
        } as SymbolEntry,
        mkdir: {
            kind: "function",
            params: [{ name: "path", type: Types.string, loc: undefined }],
            isAsync: false,
            name: "mkdir",
            modifiers: Modifiers.getNumberValueOf(["PUBLIC", "STATIC"]),
            type: new TypeClasses.function([Types.string], Types.void, []),
            loc: undefined,
            node: undefined
        } as SymbolEntry,
    } as const,

    time: {
        now: {
            kind: "function",
            params: [],
            isAsync: false,
            name: "now",
            modifiers: Modifiers.getNumberValueOf(["PUBLIC", "STATIC"]),
            type: new TypeClasses.function([], Types.int, []),
            loc: undefined,
            node: undefined
        } as SymbolEntry,
        sleep: {
            kind: "function",
            params: [{ name: "ms", type: Types.int, loc: undefined }],
            isAsync: false,
            name: "sleep",
            modifiers: Modifiers.getNumberValueOf(["PUBLIC", "STATIC"]),
            type: new TypeClasses.function([Types.int], Types.void, []),
            loc: undefined,
            node: undefined
        } as SymbolEntry,
    } as const,
} as const;

export default nativeConfig;