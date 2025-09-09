**Planned Language Features & Syntax Formats**

1. **Match Expression**

```txt
match value {
  as x : x % 2 == 0 => "even";
  default => "odd";
}
```

2. **Type & Interface System**

- **Interface** for structured objects (like JSON)

```ts
interface User {
  name: string;
  age: number;
}
```

- **Type** for primitives, unions, custom definitions

```ts
type Identifier = string | number;
```



3. **Classes (Full Proposal)**

### 3.1 Goals
- Familiar C-style classes with clear, predictable semantics.
- Single inheritance (`extends`), multiple interfaces (`implements`).
- Methods, fields, constructors, static members, access control, properties, overriding, and final/sealed.

### 3.2 Syntax

Class declaration:
```txt
class Point implements Printable {
  public float x = 0;
  public float y = 0;

  constructor(float x, float y) {
    this.x = x;
    this.y = y;
  }

  public float len() {
    return (this.x*this.x + this.y*this.y) .sqrt();
  }

  override public string toString() {
    return "Point(" + this.x + ", " + this.y + ")";
  }
}
```

Inheritance and interfaces:
```txt
class ColoredPoint extends Point implements Printable, Serializable {
  public string color;

  constructor(float x, float y, string color) : super(x, y) {
    this.color = color;
  }

  override public string toString() {
    return super.toString() + " @" + this.color;
  }
}
```

Static members:
```txt
class Counter {
  private static int next = 0;
  public static int alloc() { next = next + 1; return next; }
}
```

Getters/Setters (properties):
```txt
class User {
  private string _name;
  public get name(): string { return this._name; }
  public set name(string v) { this._name = v.trim(); }
}
```

Abstract/final/sealed:
```txt
abstract class Shape { abstract float area(); }
final class ID {}
sealed class Expr permits Lit, Add {}
```

Objects and construction:
```txt
let p: Point = new Point(1, 2);
let q = new ColoredPoint(1, 2, "red");
```

### 3.3 Access control
- `public` (everywhere), `protected` (class + subclasses), `private` (class only), `internal` (same module/pack).
- Default: `public` for methods, `private` for fields (recommendation). You can choose one default and stick to it.

### 3.4 Overloading & overriding
- **Overloading**: same name, different parameter types/arity within a class.
- **Overriding**: same signature in subclass; requires `override` keyword. Base method may be marked `virtual` to allow override, or allow override by default and `final` to forbid.

Recommendation: allow override by default, require `override` to prevent mistakes, support `final` to seal a method.

### 3.5 Generics (parametric types)
```txt
class Box<T> { private T value; constructor(T v){ this.value = v; } public T get(){ return this.value; } }
let bi: Box<int> = new Box<int>(10);
```
- Start with erasure semantics in the interpreter (types carried at runtime via tags only for checks). Add reified generics later if needed.

### 3.6 Interfaces
```txt
interface Printable { string toString(); }
interface Serializable { string toJSON(); }
```
- Classes may implement multiple interfaces. Type checker enforces method presence and signatures.

### 3.7 Constructors & initialization
- `constructor` method with optional initializer list calling `super(...)` first.
- Field initializers run before constructor body.
- If no `constructor` is declared, synthesize a default no-arg constructor that calls `super()` if available.

### 3.8 `this` and `super`
- `this` refers to the current instance.
- `super.method(args)` dispatches to the immediate superclass implementation.
- `super(...)` allowed only in constructor initializer list and must be first.

### 3.9 Static members
- Declared with `static`; accessed via `Type.member`.
- No `this` in static context; `super` not allowed.

### 3.10 Equality and hashing
- Default reference equality. Optionally allow `equals(other)` / `hashCode()` conventions the runtime can use in maps/sets.

### 3.11 Pattern matching with classes (optional phase 2)
```txt
match shape {
  is Circle as c : c.radius > 0 => c.area();
  is Rect as r : r.w > 0 && r.h > 0 => r.area();
  default => 0;
}
```
- `is Type` tests runtime type (subtype ok). `as name` binds the casted value. Guard optional after `:` as per match rules.

### 3.12 Exceptions (optional add-on)
```txt
try { risky(); } catch (IOError e) { log(e.message()); } finally { cleanup(); }
throw new IOError("fail");
```
- If exceptions are added, they are classes (extend `Error`). Stack unwinding in interpreter via control-flow exceptions.

### 3.13 Modules & visibility (outline)
- `module`/`import` for namespacing; `internal` visibility respects module boundary.

---

### 3.14 AST shapes (concise)
- `ClassDecl { name, typeParams?, superClass?, interfaces[], members[], loc }`
- `FieldDecl { name, type, modifiers, initializer? }`
- `MethodDecl { name, params[], returnType, modifiers, body }`
- `CtorDecl { params[], initializer?: SuperCall|ThisCall, body }`
- `GetAccessor/SetAccessor { name, type, modifiers, body }`
- `NewExpr { callee: TypeRef, args[] }`
- `SuperCall { args[] }`, `SuperMethodCall { name, args[] }`

---

### 3.15 Semantic rules
- Inheritance: single `extends`. Detect cycles.
- Interfaces: must implement all methods with compatible signatures.
- Overriding: signature must be compatible (covariant return, contravariant params optional; simplest is exact match initially). Require `override`.
- Access control enforced at resolve time.
- `this` not allowed in static; `super` only valid inside subclass context. `super()` must occur before field access in ctor.
- Fields: definite assignment before read (best-effort check); runtime default `null`/zero if not set.
- Generics: type arguments must satisfy bounds (later feature). For now, unconstrained `T`.

---

### 3.16 Interpreter/runtime model
- **Class registry**: map name → ClassInfo { super, interfaces, vtable, fields }.
- **Objects**: `{ class: ClassInfo, slots: Map<field, value> }`.
- **Dispatch**: method lookup through vtable/dictionary on ClassInfo, overridden entries replace base.
- **`super`**: resolved by walking to superclass vtable.
- **Access control**: enforced in resolver/type checker; interpreter trusts resolved call sites.

---

### 3.17 Overload resolution (simple plan)
- Select by arity first; if multiple, choose the one with most specific parameter types that fit the actual args. If ambiguous, error.
- No implicit numeric widening in v1 (or define an explicit promotion table and keep it deterministic).

---

### 3.18 Diagnostics
- Clear errors for unresolved members, ambiguous overloads, bad overrides (missing `override`, wrong signature), illegal `super` usage, access violations.
- Example:
```
TypeError: Method 'toString' in ColoredPoint must be marked 'override' (matches base signature) at line 7:3.
```

---

### 3.19 Minimal implementation checklist
- [ ] Parser rules for classes, members, modifiers, `extends`/`implements`.
- [ ] Symbol table: class scope, member indexing, inheritance linking.
- [ ] Type checker: member lookup, override checks, interface conformance, access rules, `this`/`super` validation.
- [ ] Interpreter objects: allocation, field storage, method dispatch, `super` calls.
- [ ] Static members and initialization order.
- [ ] Constructors and `super(...)` sequencing.
- [ ] Optional: getters/setters sugar → backing field.
- [ ] Tests: inheritance, interfaces, override, static, access control, properties, `is` checks, `match is Type`.

