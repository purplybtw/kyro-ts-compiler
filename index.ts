import { BinaryExpression, buildSourceLocation, ExpressionStatement, Node, NumberLiteral } from "./ast/nodes";
import KyroInstance from "./main/init";
import { RunnerArguments } from "./types/kyro";
import { renderFileInput } from "./util/errors";
import { requireJvNative } from "./util/native";

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

//const native = requireJvNative(); // for native c++ modules;

async function main() {  
  const args = process.argv.slice(2);

  const ky_arguments: RunnerArguments = {
    builtNative: args[0] as any,
  }

  const jv = new KyroInstance(
    renderFileInput("./tests/test.ky"), 
    "process",
    null, // error/warn handlers not needed -> running in process mode
    ky_arguments
  );
  
  jv.run();
}

main().catch(console.error);