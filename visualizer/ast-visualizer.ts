import { Node, Visitor } from "../ast/nodes";
import { Modifiers } from "../ast/modifiers";

export type VisualizationMode = 'indentation';

export class ASTVisualizer extends Visitor<string> {
  private indent = 0;
  private readonly INDENT_SIZE = 2;

  public visualize(node: Node): string {
    this.indent = 0;
    return node.accept(this);
  }

  private getIndent(): string {
    return ' '.repeat(this.indent);
  }

  private renderChildren<T>(children: T[], renderFn: (child: T) => string): string {
    if (children.length === 0) return '';

    let result = '';
    this.indent += this.INDENT_SIZE;

    for (let i = 0; i < children.length; i++) {
      result += renderFn(children[i]);
      if (i < children.length - 1) {
        result += '\n';
      }
    }

    this.indent -= this.INDENT_SIZE;
    return result;
  }

  private renderProperty(name: string, value: string): string {
    return `${this.getIndent()}${name}: ${value}`;
  }

  private renderNodeHeader(node: any): string {
    let result = `${this.getIndent()}${node.type}`;
    if ('loc' in node && node.loc) {
      result += ` [line: ${node.loc.line}, col: ${node.loc.col}]`;
    }
    return result;
  }

  default(node: Node): string {
    return this.renderNodeHeader(node);
  }

  visitProgram(node: any): string {
    let result = this.renderNodeHeader(node);

    if (node.body.length > 0) {
      result += '\n';
      result += this.renderChildren(node.body, (child: any) => child.accept(this));
    }

    return result;
  }

  visitVariableDeclaration(node: any): string {
    let result = this.renderNodeHeader(node);

    result += '\n';
    result += this.renderProperty('isConstant', node.isConstant.toString());

    result += '\n';
    result += this.renderProperty('type', node.varType.accept(this));

    if (node.identifiers && node.identifiers.length > 1) {
      result += '\n';
      result += this.renderProperty('identifiers', `[${node.identifiers.length} items]`);
    } else {
      result += '\n';
      result += this.renderProperty('identifier', node.identifier.accept(this));
    }

    if (node.initializer) {
      result += '\n';
      result += this.renderProperty('initializer', node.initializer.accept(this));
    }

    return result;
  }

  visitExpressionStatement(node: any): string {
    let result = this.renderNodeHeader(node);

    result += '\n';
    result += this.renderProperty('expression', node.expression.accept(this));

    return result;
  }

  visitIdentifier(node: any): string {
    return `Identifier("${node.name}") [line: ${node.loc.line}, col: ${node.loc.col}]`;
  }

  visitTypeReference(node: any): string {
    let result = `TypeReference("${node.name}") [line: ${node.loc.line}, col: ${node.loc.col}]`;

    if (node.generics && node.generics.length > 0) {
      const fullResult = this.renderNodeHeader({type: 'TypeReference', loc: node.loc});
      result = fullResult + '\n';
      result += this.renderChildren([{name: 'name', value: `"${node.name}"`}, {name: 'generics', value: '[generics]'}], 
        (prop: any) => {
          if (prop.name === 'generics') {
            return this.renderChildren(node.generics, (generic: any) => generic.accept(this));
          }
          return this.renderProperty(prop.name, prop.value);
        }
      );
    }

    return result;
  }

  visitBooleanLiteral(node: any): string {
    return `BooleanLiteral(${node.value}) [line: ${node.loc.line}, col: ${node.loc.col}]`;
  }

  visitNumberLiteral(node: any): string {
    return `NumberLiteral(${node.value}) [line: ${node.loc.line}, col: ${node.loc.col}]`;
  }

  visitStringLiteral(node: any): string {
    return `StringLiteral("${node.value}") [line: ${node.loc.line}, col: ${node.loc.col}]`;
  }

  visitAssignment(node: any): string {
    let result = this.renderNodeHeader(node);

    const properties = [
      { name: 'left', value: node.left.accept(this) },
      { name: 'right', value: node.right.accept(this) }
    ];

    result += '\n';
    result += this.renderChildren(properties, (prop: any) => 
      this.renderProperty(prop.name, prop.value)
    );

    return result;
  }

  visitMemberExpression(node: any): string {
    let result = this.renderNodeHeader(node);

    const properties = [
      { name: 'object', value: node.object.accept(this) },
      { name: 'property', value: node.property.accept(this) },
      { name: 'computed', value: node.computed.toString() }
    ];

    result += '\n';
    result += this.renderChildren(properties, (prop: any) => 
      this.renderProperty(prop.name, prop.value)
    );

    return result;
  }

  visitBinaryExpression(node: any): string {
    let result = this.renderNodeHeader(node);

    const properties = [
      { name: 'left', value: node.left.accept(this) },
      { name: 'operator', value: node.operator },
      { name: 'right', value: node.right.accept(this) }
    ];

    result += '\n';
    result += this.renderChildren(properties, (prop: any) => 
      this.renderProperty(prop.name, prop.value)
    );

    return result;
  }

  visitLogicalExpression(node: any): string {
    let result = this.renderNodeHeader(node);

    const properties = [
      { name: 'left', value: node.left.accept(this) },
      { name: 'operator', value: node.operator },
      { name: 'right', value: node.right.accept(this) }
    ];

    result += '\n';
    result += this.renderChildren(properties, (prop: any) => 
      this.renderProperty(prop.name, prop.value)
    );

    return result;
  }

  visitConditionalExpression(node: any): string {
    let result = this.renderNodeHeader(node);

    const properties = [
      { name: 'test', value: node.test.accept(this) },
      { name: 'consequent', value: node.consequent.accept(this) },
      { name: 'alternate', value: node.alternate.accept(this) }
    ];

    result += '\n';
    result += this.renderChildren(properties, (prop: any) => 
      this.renderProperty(prop.name, prop.value)
    );

    return result;
  }

  visitUnaryExpression(node: any): string {
    let result = this.renderNodeHeader(node);

    const properties = [
      { name: 'operator', value: node.operator },
      { name: 'operand', value: node.operand.accept(this) }
    ];

    result += '\n';
    result += this.renderChildren(properties, (prop: any) => 
      this.renderProperty(prop.name, prop.value)
    );

    return result;
  }

  visitUpdateExpression(node: any): string {
    let result = this.renderNodeHeader(node);

    const properties = [
      { name: 'operator', value: node.operator },
      { name: 'prefix', value: node.prefix.toString() },
      { name: 'operand', value: node.operand.accept(this) }
    ];

    result += '\n';
    result += this.renderChildren(properties, (prop: any) => 
      this.renderProperty(prop.name, prop.value)
    );

    return result;
  }

  visitCallExpression(node: any): string {
    let result = this.renderNodeHeader(node);

    result += '\n';
    result += this.renderProperty('callee', node.callee.accept(this));

    if (node.args.length > 0) {
      result += '\n';
      result += this.renderChildren(node.args, (arg: any) => arg.accept(this));
    }

    return result;
  }

  visitArrayExpression(node: any): string {
    let result = this.renderNodeHeader(node);

    if (node.elements.length > 0) {
      result += '\n';
      result += this.renderChildren([{ name: 'elements', value: '[elements]' }], (prop: any) => {
        if (prop.name === 'elements') {
          return this.renderChildren(node.elements, (element: any) => element.accept(this));
        }
        return this.renderProperty(prop.name, prop.value);
      });
    }

    return result;
  }

  visitBlock(node: any): string {
    let result = this.renderNodeHeader(node);

    if (node.statements.length > 0) {
      result += '\n';
      result += this.renderChildren(node.statements, (statement: any) => statement.accept(this));
    }

    return result;
  }

  visitIfStatement(node: any): string {
    let result = this.renderNodeHeader(node);

    const properties = [
      { name: 'condition', value: node.condition.accept(this) },
      { name: 'then', value: node.thenBranch.accept(this) }
    ];

    if (node.elifBranches && node.elifBranches.length > 0) {
      properties.push({ name: 'elif branches', value: '[elif branches]' });
    }

    if (node.elseBranch) {
      properties.push({ name: 'else', value: node.elseBranch.accept(this) });
    }

    result += '\n';
    result += this.renderChildren(properties, (prop: any) => {
      if (prop.name === 'elif branches') {
        return this.renderChildren(node.elifBranches, (elif: any) => elif.accept(this));
      }
      return this.renderProperty(prop.name, prop.value);
    });

    return result;
  }

  visitElseIfStatement(node: any): string {
    let result = this.renderNodeHeader(node);

    const properties = [
      { name: 'condition', value: node.condition.accept(this) },
      { name: 'then', value: node.thenBranch.accept(this) }
    ];

    result += '\n';
    result += this.renderChildren(properties, (prop: any) => 
      this.renderProperty(prop.name, prop.value)
    );

    return result;
  }

  visitWhileStatement(node: any): string {
    let result = this.renderNodeHeader(node);

    const properties = [
      { name: 'condition', value: node.condition.accept(this) },
      { name: 'body', value: node.body.accept(this) }
    ];

    result += '\n';
    result += this.renderChildren(properties, (prop: any) => 
      this.renderProperty(prop.name, prop.value)
    );

    return result;
  }

  visitForStatement(node: any): string {
    let result = this.renderNodeHeader(node);

    const properties = [];

    if (node.init) {
      properties.push({ name: 'init', value: node.init.accept(this) });
    }
    if (node.condition) {
      properties.push({ name: 'condition', value: node.condition.accept(this) });
    }
    if (node.update) {
      properties.push({ name: 'update', value: node.update.accept(this) });
    }
    if (node.body) {
      properties.push({ name: 'body', value: node.body.accept(this) });
    }

    if (properties.length > 0) {
      result += '\n';
      result += this.renderChildren(properties, (prop: any) => 
        this.renderProperty(prop.name, prop.value)
      );
    }

    return result;
  }

  visitFunctionDeclaration(node: any): string {
    let result = this.renderNodeHeader(node);

    const properties = [
      { name: 'returnType', value: node.returnType.accept(this) },
      { name: 'identifier', value: node.identifier.accept(this) }
    ];

    if (node.parameters.length > 0) {
      properties.push({ name: 'parameters', value: '[parameters]' });
    }

    properties.push({ name: 'body', value: node.body.accept(this) });

    result += '\n';
    result += this.renderChildren(properties, (prop: any) => {
      if (prop.name === 'parameters') {
        return this.renderChildren(node.parameters, (param: any) => param.accept(this));
      }
      return this.renderProperty(prop.name, prop.value);
    });

    return result;
  }

  visitParameter(node: any): string {
    let result = this.renderNodeHeader(node);

    const properties = [
      { name: 'identifier', value: node.identifier.accept(this) },
      { name: 'type', value: node.paramType.accept(this) }
    ];

    result += '\n';
    result += this.renderChildren(properties, (prop: any) => 
      this.renderProperty(prop.name, prop.value)
    );

    return result;
  }

  visitTypeDeclaration(node: any): string {
    let result = this.renderNodeHeader(node);

    const properties = [
      { name: 'identifier', value: node.identifier.accept(this) }
    ];

    if (node.fields.length > 0) {
      properties.push({ name: 'fields', value: '[fields]' });
    }

    result += '\n';
    result += this.renderChildren(properties, (prop: any) => {
      if (prop.name === 'fields') {
        return this.renderChildren(node.fields, (field: any) => {
          const fieldResult = this.renderNodeHeader({type: 'Field', loc: field.loc || {}});
          const fieldProps = [
            { name: 'identifier', value: field.identifier.accept(this) },
            { name: 'type', value: field.varType.accept(this) }
          ];
          return fieldResult + '\n' + this.renderChildren(fieldProps, (fp: any) => 
            this.renderProperty(fp.name, fp.value)
          );
        });
      }
      return this.renderProperty(prop.name, prop.value);
    });

    return result;
  }

  visitReturnStatement(node: any): string {
    let result = this.renderNodeHeader(node);

    if (node.argument) {
      const properties = [
        { name: 'argument', value: node.argument.accept(this) }
      ];

      result += '\n';
      result += this.renderChildren(properties, (prop: any) => 
        this.renderProperty(prop.name, prop.value)
      );
    }

    return result;
  }

  visitBreakStatement(node: any): string {
    return this.renderNodeHeader(node);
  }

  visitContinueStatement(node: any): string {
    return this.renderNodeHeader(node);
  }

  visitNewExpression(node: any): string {
    let result = this.renderNodeHeader(node);

    const properties = [
      { name: 'callee', value: '[callee]' }
    ];

    if (node.args.length > 0) {
      properties.push({ name: 'arguments', value: '[arguments]' });
    }

    result += '\n';
    result += this.renderChildren(properties, (prop: any) => {
      if (prop.name === 'callee') {
        return this.renderChildren([node.callee], (callee: any) => callee.accept(this));
      }
      if (prop.name === 'arguments') {
        return this.renderChildren(node.args, (arg: any) => arg.accept(this));
      }
      return this.renderProperty(prop.name, prop.value);
    });

    return result;
  }

  visitObjectExpression(node: any): string {
    let result = this.renderNodeHeader(node);

    if (node.properties.length > 0) {
      const properties = [{ name: 'properties', value: '[properties]' }];

      result += '\n';
      result += this.renderChildren(properties, (prop: any) => {
        return this.renderChildren(node.properties, (property: any) => property.accept(this));
      });
    }

    return result;
  }

  visitProperty(node: any): string {
    let result = this.renderNodeHeader(node);

    const properties = [
      { name: 'key', value: node.key.accept(this) },
      { name: 'value', value: node.value.accept(this) }
    ];

    result += '\n';
    result += this.renderChildren(properties, (prop: any) => 
      this.renderProperty(prop.name, prop.value)
    );

    return result;
  }

  visitArrayType(node: any): string {
    let result = this.renderNodeHeader(node);

    const properties = [
      { name: 'elementType', value: node.elementType.accept(this) }
    ];

    result += '\n';
    result += this.renderChildren(properties, (prop: any) => 
      this.renderProperty(prop.name, prop.value)
    );

    return result;
  }

  visitSwitchStatement(node: any): string {
    let result = this.renderNodeHeader(node);

    result += '\n';
    result += this.renderProperty('scrutinee', node.scrutinee.accept(this));

    if (node.cases && node.cases.length > 0) {
      result += '\n';
      result += this.renderChildren(node.cases, (caseNode: any) => caseNode.accept(this));
    }

    if (node.defaultCase) {
      result += '\n';
      result += this.renderProperty('defaultCase', node.defaultCase.accept(this));
    }

    return result;
  }

  visitSwitchCase(node: any): string {
    let result = this.renderNodeHeader(node);

    if (node.patterns && node.patterns.length > 0) {
      result += '\n';
      result += this.renderChildren(node.patterns, (pattern: any) => pattern.accept(this));
    }

    result += '\n';
    result += this.renderProperty('body', node.body.accept(this));

    return result;
  }

  visitLiteralPattern(node: any): string {
    let result = this.renderNodeHeader(node);

    result += '\n';
    result += this.renderProperty('value', node.value.accept(this));

    if (node.guard) {
      result += '\n';
      result += this.renderProperty('guard', node.guard.accept(this));
    }

    return result;
  }

  visitRangePattern(node: any): string {
    let result = this.renderNodeHeader(node);

    result += '\n';
    result += this.renderProperty('start', node.start.accept(this));

    result += '\n';
    result += this.renderProperty('end', node.end.accept(this));

    if (node.guard) {
      result += '\n';
      result += this.renderProperty('guard', node.guard.accept(this));
    }

    return result;
  }

  visitIdentifierPattern(node: any): string {
    let result = this.renderNodeHeader(node);

    const properties = [
      { name: 'identifier', value: node.identifier.accept(this) },
      { name: 'isLet', value: node.isLet.toString() }
    ];

    if (node.guard) {
      properties.push({ name: 'guard', value: node.guard.accept(this) });
    }

    result += '\n';
    result += this.renderChildren(properties, (prop: any) => 
      this.renderProperty(prop.name, prop.value)
    );

    return result;
  }

  visitBindingPattern(node: any): string {
    let result = this.renderNodeHeader(node);

    const properties = [
      { name: 'identifier', value: node.identifier.accept(this) }
    ];

    if (node.guard) {
      properties.push({ name: 'guard', value: node.guard.accept(this) });
    }

    result += '\n';
    result += this.renderChildren(properties, (prop: any) => 
      this.renderProperty(prop.name, prop.value)
    );

    return result;
  }

  visitGuardedPattern(node: any): string {
    let result = this.renderNodeHeader(node);

    const properties = [
      { name: 'pattern', value: node.pattern.accept(this) },
      { name: 'guard', value: node.guard.accept(this) }
    ];

    result += '\n';
    result += this.renderChildren(properties, (prop: any) => 
      this.renderProperty(prop.name, prop.value)
    );

    return result;
  }

  visitTryStatement(node: any): string {
    let result = this.renderNodeHeader(node);

    result += '\n';
    result += this.renderProperty('body', node.body.accept(this));

    if (node.catchClause) {
      result += '\n';
      result += this.renderProperty('catchClause', node.catchClause.accept(this));
    }

    if (node.finallyClause) {
      result += '\n';
      result += this.renderProperty('finallyClause', node.finallyClause.accept(this));
    }

    return result;
  }

  visitCatchClause(node: any): string {
    let result = this.renderNodeHeader(node);

    result += '\n';
    result += this.renderProperty('paramType', node.paramType.accept(this));

    result += '\n';
    result += this.renderProperty('param', node.param.accept(this));

    result += '\n';
    result += this.renderProperty('body', node.body.accept(this));

    return result;
  }

  visitFinallyClause(node: any): string {
    let result = this.renderNodeHeader(node);

    result += '\n';
    result += this.renderProperty('body', node.body.accept(this));

    return result;
  }

  visitThrowStatement(node: any): string {
    let result = this.renderNodeHeader(node);

    const properties = [
      { name: 'expression', value: node.expression.accept(this) }
    ];

    result += '\n';
    result += this.renderChildren(properties, (prop: any) => 
      this.renderProperty(prop.name, prop.value)
    );

    return result;
  }

  visitInferType(node: any): string {
    return this.renderNodeHeader(node);
  }

  visitVoidType(node: any): string {
    return this.renderNodeHeader(node);
  }

  // Missing class-related nodes
  visitClassDeclaration(node: any): string {
    let result = this.renderNodeHeader(node);

    const properties = [
      { name: 'identifier', value: node.identifier.accept(this) }
    ];

    if (node.modifiers) {
      properties.push({ name: 'modifiers', value: this.formatModifiers(node.modifiers) });
    }

    if (node.extending) {
      properties.push({ name: 'extends', value: node.extending.accept(this) });
    }

    if (node.interfaces && node.interfaces.length > 0) {
      properties.push({ name: 'interfaces', value: '[interfaces]' });
    }

    if (node.body && node.body.length > 0) {
      properties.push({ name: 'body', value: '[class members]' });
    }

    result += '\n';
    result += this.renderChildren(properties, (prop: any) => {
      if (prop.name === 'interfaces') {
        return this.renderChildren(node.interfaces, (iface: any) => iface.accept(this));
      }
      if (prop.name === 'body') {
        return this.renderChildren(node.body, (member: any) => member.accept(this));
      }
      return this.renderProperty(prop.name, prop.value);
    });

    return result;
  }

  visitMethodDefinition(node: any): string {
    let result = this.renderNodeHeader(node);

    const properties = [
      { name: 'identifier', value: node.identifier.accept(this) },
      { name: 'returnType', value: node.returnType.accept(this) }
    ];

    if (node.modifiers) {
      properties.push({ name: 'modifiers', value: this.formatModifiers(node.modifiers) });
    }

    if (node.generics && node.generics.length > 0) {
      properties.push({ name: 'generics', value: '[generics]' });
    }

    if (node.parameters && node.parameters.length > 0) {
      properties.push({ name: 'parameters', value: '[parameters]' });
    }

    properties.push({ name: 'body', value: node.body.accept(this) });

    result += '\n';
    result += this.renderChildren(properties, (prop: any) => {
      if (prop.name === 'generics') {
        return this.renderChildren(node.generics, (generic: any) => generic.accept(this));
      }
      if (prop.name === 'parameters') {
        return this.renderChildren(node.parameters, (param: any) => param.accept(this));
      }
      return this.renderProperty(prop.name, prop.value);
    });

    return result;
  }

  visitPropertyDefinition(node: any): string {
    let result = this.renderNodeHeader(node);

    const properties = [
      { name: 'identifier', value: node.identifier.accept(this) },
      { name: 'type', value: node.varType.accept(this) }
    ];

    if (node.modifiers) {
      properties.push({ name: 'modifiers', value: this.formatModifiers(node.modifiers) });
    }

    if (node.initializer) {
      properties.push({ name: 'initializer', value: node.initializer.accept(this) });
    }

    result += '\n';
    result += this.renderChildren(properties, (prop: any) => 
      this.renderProperty(prop.name, prop.value)
    );

    return result;
  }

  visitConstructor(node: any): string {
    let result = this.renderNodeHeader(node);

    const properties = [];

    if (node.modifiers) {
      properties.push({ name: 'modifiers', value: this.formatModifiers(node.modifiers) });
    }

    if (node.parameters && node.parameters.length > 0) {
      properties.push({ name: 'parameters', value: '[parameters]' });
    }

    properties.push({ name: 'body', value: node.body.accept(this) });

    result += '\n';
    result += this.renderChildren(properties, (prop: any) => {
      if (prop.name === 'parameters') {
        return this.renderChildren(node.parameters, (param: any) => param.accept(this));
      }
      return this.renderProperty(prop.name, prop.value);
    });

    return result;
  }

  visitSuper(node: any): string {
    return this.renderNodeHeader(node);
  }

  // Missing expression nodes
  visitUnionType(node: any): string {
    let result = this.renderNodeHeader(node);

    const properties = [
      { name: 'left', value: node.left.accept(this) },
      { name: 'right', value: node.right.accept(this) }
    ];

    result += '\n';
    result += this.renderChildren(properties, (prop: any) => 
      this.renderProperty(prop.name, prop.value)
    );

    return result;
  }

  visitIntersectionType(node: any): string {
    let result = this.renderNodeHeader(node);

    const properties = [
      { name: 'left', value: node.left.accept(this) },
      { name: 'right', value: node.right.accept(this) }
    ];

    result += '\n';
    result += this.renderChildren(properties, (prop: any) => 
      this.renderProperty(prop.name, prop.value)
    );

    return result;
  }

  visitMatchExpression(node: any): string {
    let result = this.renderNodeHeader(node);

    result += '\n';
    result += this.renderProperty('scrutinee', node.scrutinee.accept(this));

    if (node.arms && node.arms.length > 0) {
      result += '\n';
      result += this.renderChildren(node.arms, (arm: any) => arm.accept(this));
    }

    if (node.defaultArm) {
      result += '\n';
      result += this.renderProperty('defaultArm', node.defaultArm.accept(this));
    }

    return result;
  }

  visitMatchArm(node: any): string {
    let result = this.renderNodeHeader(node);

    const properties = [
      { name: 'pattern', value: node.pattern.accept(this) },
      { name: 'consequence', value: node.consequence.accept(this) }
    ];

    result += '\n';
    result += this.renderChildren(properties, (prop: any) => 
      this.renderProperty(prop.name, prop.value)
    );

    return result;
  }

  visitCheckExpression(node: any): string {
    let result = this.renderNodeHeader(node);

    result += '\n';
    result += this.renderProperty('subject', node.subject.accept(this));

    if (node.checks && node.checks.length > 0) {
      result += '\n';
      result += this.renderChildren(node.checks, (check: any) => check.accept(this));
    }

    if (node.any !== undefined) {
      result += '\n';
      result += this.renderProperty('any', node.any.toString());
    }

    return result;
  }

  visitCheckComparison(node: any): string {
    let result = this.renderNodeHeader(node);

    const properties = [
      { name: 'operator', value: node.operator },
      { name: 'value', value: node.value.accept(this) }
    ];

    result += '\n';
    result += this.renderChildren(properties, (prop: any) => 
      this.renderProperty(prop.name, prop.value)
    );

    return result;
  }

  visitRangeExpression(node: any): string {
    let result = this.renderNodeHeader(node);

    const properties = [
      { name: 'start', value: node.start.accept(this) },
      { name: 'end', value: node.end.accept(this) }
    ];

    result += '\n';
    result += this.renderChildren(properties, (prop: any) => 
      this.renderProperty(prop.name, prop.value)
    );

    return result;
  }

  // Helper method to format modifiers
  private formatModifiers(modifiers: number): string {
    // Handle undefined or zero modifiers
    if (!modifiers || modifiers === 0) {
      return '[no modifiers]';
    }
    
    // Create a temporary BitFlag instance to decode the flags
    const tempModifiers = Modifiers.clone().setValue(modifiers);
    const activeFlags = tempModifiers.getActiveFlags();
    
    if (activeFlags.length === 0) {
      return '[no modifiers]';
    }
    
    return `[${activeFlags.join(', ')}]`;
  }
}

export function visualizeAST(ast: Node): string {
  const visualizer = new ASTVisualizer();
  return visualizer.visualize(ast);
}