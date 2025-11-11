import { BinaryExpression, buildSourceLocation, ExpressionStatement, Node, NumberLiteral } from "./ast/nodes";
import KyroCompiler from "./main/init";
import { renderFileInput } from "./util/errors";

function evaluateBinaryExpression(node: BinaryExpression): number {
  const left = evaluateExpression(node.left);
  const right = evaluateExpression(node.right);

  switch (node.operator) {
    case '+': return left + right;
    case '-': return left - right;
    case '*': return left * right;
    case '/': return left / right;
    default: throw new Error(`Unknown operator: ${node.operator}`);
  }
}

export function evaluateExpression(node: Node): number {
  if (node instanceof NumberLiteral) {
    return node.value;
  }

  if (node instanceof ExpressionStatement) {
    node = node.expression;
  }
  
  if (node instanceof BinaryExpression) {
    if(node.left instanceof BinaryExpression) 
      node.left = new NumberLiteral(node.loc, evaluateExpression(node.left));
    if(node.right instanceof BinaryExpression) 
      node.right = new NumberLiteral(node.loc, evaluateExpression(node.right));
    return evaluateBinaryExpression(node);
  }
  
  throw new Error(`Cannot evaluate node type: ${node.type}`);
}

async function main() {  
  const jv = new KyroCompiler(
    renderFileInput("./tests/test.ky"), 
    renderFileInput("./tests/test.cky"), 
    "process",
    null, // error/warn handlers not needed -> running in process mode
  );
  
  jv.run();
}

main().catch(console.error);