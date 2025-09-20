export enum OpCode {
    // Stack operations
    NOP = 0x00,
    PUSH_INT = 0x01,
    PUSH_FLOAT = 0x02,
    PUSH_CONST = 0x03,   // Push constant from pool (string, float, etc.)
    POP = 0x04,
    DUP = 0x05,          // Duplicate top of stack
    SWAP = 0x06,         // Swap top two stack elements

    // Arithmetic
    ADD = 0x10,
    SUB = 0x11,
    MUL = 0x12,
    DIV = 0x13,
    MOD = 0x14,
    NEG = 0x15,          // Unary minus

    // Comparison
    EQ = 0x20,
    NEQ = 0x21,
    LT = 0x22,
    LTE = 0x23,
    GT = 0x24,
    GTE = 0x25,

    // Logical
    AND = 0x30,
    OR = 0x31,
    NOT = 0x32,

    // Variable / locals
    LOAD_LOCAL = 0x40,
    STORE_LOCAL = 0x41,
    LOAD_GLOBAL = 0x42,
    STORE_GLOBAL = 0x43,

    // Control flow
    JMP = 0x50,
    JMP_IF_TRUE = 0x51,
    JMP_IF_FALSE = 0x52,
    CALL = 0x53,
    RET = 0x54,
    HALT = 0x55,

    // Function / closures
    CLOSURE = 0x60,
    LOAD_UPVALUE = 0x61,
    STORE_UPVALUE = 0x62,

    // Objects / classes
    NEW_OBJECT = 0x70,
    GET_PROPERTY = 0x71,
    SET_PROPERTY = 0x72,
    GET_INDEX = 0x73,
    SET_INDEX = 0x74,
    CALL_METHOD = 0x75,
    INHERIT = 0x76,
    SUPER_CALL = 0x77,

    // Arrays
    NEW_ARRAY = 0x80,
    ARRAY_PUSH = 0x81,
    ARRAY_POP = 0x82,
    ARRAY_LENGTH = 0x83,

    // Error handling
    THROW = 0x90,
    TRY = 0x91,
    END_TRY = 0x92,
    CATCH = 0x93,

    // optional
    PRINT = 0xA0,
}