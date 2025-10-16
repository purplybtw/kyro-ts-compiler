
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

export function requireAddon<T = any>(modulePath: string): T {
  return require(modulePath) as T;
}

export function requireBridge() {
  return requireAddon<
    typeof import('../lib/build/Release/bridge.node')
  >('../lib/build/Release/bridge.node');
}