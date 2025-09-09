
# Parser Implementation TODO - Detailed Breakdown

## Missing Control Flow Constructs

### 1. Try/Catch/Throw/Finally Statements
- [x] Add `TryStatement` AST node with try block, catch clauses, and optional finally
- [x] Add `CatchClause` AST node with exception type and variable binding
- [x] Add `ThrowStatement` AST node with expression to throw
- [x] Add `FinallyClause` AST node
- [x] Implement `parseTryStatement()` method
- [x] Implement `parseThrowStatement()` method
- [x] Add parsing logic in `parseStatement()` switch

### 2. Switch/Case Statements  
- [x] Add `SwitchStatement` AST node with discriminant and cases
- [x] Add `SwitchCase` AST node with test expression and consequent statements
- [x] Implement `parseSwitchStatement()` method
- [x] Handle `case` and `default` keywords in switch context
- [x] Add break statement handling within switch
- [x] Support multiple case labels (`case 1 | 2 | 3`)

### 3. Class Declarations
- [ ] Add `ClassDeclaration` AST node
- [ ] Add `MethodDefinition` AST node for class methods
- [ ] Add `PropertyDefinition` AST node for class fields
- [ ] Add `Constructor` AST node
- [ ] Add `Super` AST node for super calls
- [ ] Implement `parseClassDeclaration()` method
- [ ] Parse class inheritance (`extends` keyword)
- [ ] Parse interface implementation (`implements` keyword)
- [ ] Handle access modifiers (public, private, protected)
- [ ] Parse static members
- [ ] Parse abstract/final modifiers

## Function and Operator Overloading

### 4. Function Overloading Support
- [ ] Modify `FunctionDeclaration` to track signature information
- [ ] Add `signature` getter method to generate unique signatures
- [ ] Add `OverloadGroup` AST node to manage multiple function overloads
- [ ] Modify parser to group functions by name during parsing
- [ ] Add overload conflict detection
- [ ] Update visitor interface for `OverloadGroup`

### 5. Operator Overloading Support
- [ ] Add `isOperatorOverload` flag to `FunctionDeclaration`
- [ ] Add `operatorSymbol` property to track which operator is overloaded
- [ ] Add parsing for operator overload syntax (`func operator+(a: int, b: int): int`)
- [ ] Create operator precedence mapping for overloaded operators
- [ ] Add validation for operator overload signatures

## Missing Expression Types

### 6. Match Expressions
- [ ] Add `MatchExpression` AST node with scrutinee and arms
- [ ] Add `MatchArm` AST node with pattern and body
- [ ] Add pattern AST nodes: `LiteralPattern`, `IdentifierPattern`, `WildcardPattern`
- [ ] Add `RangePattern` for range matching (`1..5`)
- [ ] Implement `parseMatchExpression()` method
- [ ] Parse match arms with `=>` syntax
- [ ] Handle `default` case in match
- [ ] Add exhaustiveness checking (basic)

### 7. Check Expressions (comp expressions)
- [ ] Add `CheckExpression` AST node
- [ ] Add `CheckClause` AST node for individual checks
- [ ] Implement `parseCheckExpression()` method
- [ ] Parse `check x (<5; >3; ==4)` syntax
- [ ] Support `check any` for OR logic
- [ ] Add proper parentheses and semicolon handling

### 8. Range Expressions
- [ ] Add `RangeExpression` AST node
- [ ] Parse `a..b` inclusive range syntax
- [ ] Decide on exclusive range syntax (`a..<b` or similar)
- [ ] Integrate with match patterns and for loops

## Type System Completions

### 9. Missing Primitive Types
- [ ] Add `STRING` to `DataTypes` enum in keywords.ts
- [ ] Update type parsing to handle `string` primitive
- [ ] Ensure string literals create proper string types

### 10. Advanced Type Features
- [ ] Complete `UnionType` and `IntersectionType` parsing
- [ ] Add nullable type syntax (`Type?`)
- [ ] Add function type syntax (`(int, string) => bool`)
- [ ] Add tuple type syntax (`[int, string, bool]`)

## Parser Infrastructure Improvements

### 11. Error Recovery
- [ ] Add synchronization points for better error recovery
- [ ] Implement `synchronize()` method for panic mode recovery
- [ ] Add more specific error messages for common mistakes
- [ ] Improve error reporting with suggestions

### 12. Parser Helper Methods
- [ ] Add `expectSemicolon()` helper for consistent semicolon handling
- [ ] Add `parseModifiers()` for access modifiers (public, private, etc.)
- [ ] Add `parseTypeParameters()` for generic type parameters
- [ ] Add `parseParameterList()` refactoring for reuse
- [ ] Add `parseBlockOrStatement()` helper

### 13. Lookahead Improvements
- [ ] Add multi-token lookahead for complex constructs
- [ ] Improve type vs expression disambiguation
- [ ] Handle ambiguous parsing situations (cast vs parentheses)

## AST Node Completions

### 14. Missing Visitor Methods
- [ ] Add `visitOverloadGroup()` to visitor interface
- [ ] Add `visitTryStatement()` and related catch/finally visitors
- [ ] Add `visitClassDeclaration()` and class member visitors
- [ ] Add `visitMatchExpression()` and pattern visitors
- [ ] Add `visitCheckExpression()` visitor
- [ ] Add `visitRangeExpression()` visitor

### 15. AST Validation
- [ ] Add validation for function signatures in overload groups
- [ ] Add validation for class member conflicts
- [ ] Add validation for match pattern types
- [ ] Add validation for operator overload signatures

## Parser Integration

### 16. Statement Parsing Updates
- [ ] Update main `parseStatement()` method with all new constructs
- [ ] Update `parseExpression()` for new expression types
- [ ] Update precedence parsing for new operators
- [ ] Handle context-sensitive parsing (class context, match context)

### 17. Testing Infrastructure
- [ ] Create parser test files for each new construct
- [ ] Add positive test cases for valid syntax
- [ ] Add negative test cases for invalid syntax
- [ ] Add edge case tests (empty blocks, complex nesting)
- [ ] Add performance tests for complex constructs

## Implementation Priority Order:
1. **Function/Operator Overloading** (foundation for advanced features)
2. **Try/Catch/Throw** (common control flow)
3. **Switch/Case** (alternative to match for simple cases)
4. **Match Expressions** (powerful pattern matching)
5. **Class Declarations** (object-oriented features)
6. **Check Expressions** (syntactic sugar)
7. **Advanced Types** (nullable, union, function types)
8. **Error Recovery** (developer experience)

Each item should be implemented with corresponding AST nodes, parsing methods, visitor support, and tests.
