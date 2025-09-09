# Javon Language Specification

This document describes the syntax and rules of the Javon Language.
It is a typed, semicolon-enforced language inspired by C/Java, but with distinct differences such as Python and TypeScript-like conditions, `elif`, and parameter type syntax.

---

## 1. Variables

### Declaration

```
int x = 10;
float y = 20.5;
string name = "Purply";
bool flag = true;
```

* Explicit type required before variable name.
* Semicolons are mandatory.

---

## 2. Functions

### Definition

```
int add(a: int, b: int) {
    return a + b;
}

void greet(who: string) {
    print("Hello, " + who);
}
```

* Return type comes before the function name.
* Parameter types are declared **after** the parameter name (`a: int`).
* Functions must return a value matching the declared return type unless `void`.

---

## 3. Conditionals

```
if x > 10 {
    print("greater");
} elif x == 10 {
    print("equal");
} else {
    print("smaller");
}
```

* No parentheses required around conditions.
* `elif` replaces `else if`.
* Braces `{ }` are required.

---

## 4. Loops

### For Loop

```
for (int i = 0; i < 5; i = i + 1) {
    print(i);
}
```

* Standard C/Java style.
* Parentheses required.

### While Loop

```
while count < 5 {
    count = count + 1;
}
```

* No parentheses around condition.
* Executes while condition is true.

---

## 5. Types (Structs)

### Definition

```
type User {
    string name;
    int age;
}
```

### Instantiation

```
User u = {
    name: "Alice";
    age: 25;
};

print(u.name);
```

* `type` defines a struct-like type.
* Fields require semicolons.
* Object construction uses braces with `field: value;`.

---

## 6. Arrays

```
int[] nums = [1, 2, 3, 4];

for (int i = 0; i < nums.length; i = i + 1) {
    print(nums[i]);
}
```

* Array declaration uses `int[]`.
* Length accessible with `.length`.

---

## 7. Comments

```
// single line

/* multi
   line */
```

---

## 8. Key Design Differences

* **Typed like C/Java**, but with unique twists:

  * No parentheses in `if` and `while` conditions.
  * Function parameters typed after the name (`a: int`).
  * `elif` keyword instead of `else if`.
  * Structs with `type` keyword and JSON-like object construction.
* **Semicolons enforced** everywhere.
* **For loops** use C-style syntax, keeping clarity.

---
