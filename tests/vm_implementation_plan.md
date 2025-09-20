# Javon VM Architecture Plan

## Overview
This document describes the architecture for the Javon programming language runtime. The system splits responsibilities between **TypeScript** (frontend/compiler) and **C++** (VM, memory management, native functions) with a minimal **N-API bridge** for Node.js integration.

---

## 1. C++ VM & Runtime
- Implements the **full interpreter loop**:
  - Bytecode fetch → decode → execute
- Handles **memory management** and garbage collection
- Provides a **native function registry**
- All performance-critical code lives here
- Examples of responsibilities:
  - Arithmetic & logic instructions
  - Control flow instructions (if, loops, switch)
  - Object creation, class management, inheritance
  - Exception handling (`try/catch/finally`)

---

## 2. N-API Bridge (Single File)
- Purpose: expose minimal C++ VM functionality to Node.js
- Responsibilities:
  - `runBytecode(buffer)` → run compiled Javon code
  - `registerNative(name, jsFunction)` → optional JS-callable native functions
- Handles **marshaling** between JS and C++ values
- Does **not** implement VM logic

---

## 3. TypeScript Frontend
- Fully responsible for:
  - Lexing Javon source
  - Parsing into AST
  - Emitting bytecode
- Calls the **C++ VM** via the N-API bridge
- Optionally defines JS-native functions for flexibility
- No interpreter loop is run in TypeScript

---

## Benefits
- **Performance:** C++ handles execution; minimal JS overhead
- **Readability:** Clear separation of frontend and VM/runtime
- **Scalability:** VM is host-agnostic; Node is only a bridge
- **Debuggability:** Small N-API boundary simplifies troubleshooting

---

## Folder/File Layout (Example)

/javon-vm
│
├─ /cpp-vm/ # All C++ runtime code
│ ├─ VM.cpp
│ ├─ MemoryManager.cpp
│ ├─ NativeFunctions.cpp
│ └─ ...
│
├─ /napi-bridge/ # Single N-API bridge file
│ └─ bridge.cpp
│
└─ /typescript-frontend/
├─ lexer.ts
├─ parser.ts
├─ codegen.ts
└─ main.ts