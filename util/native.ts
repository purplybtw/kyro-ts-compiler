
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

/**
 * Import a native .node module with TypeScript types
 * @param modulePath - Path to the .node file
 * @returns Typed native module
 */
export function requireAddon<T = any>(modulePath: string): T {
  return require(modulePath) as T;
}

// Import the interface from your type definitions

// Specific typed import for your jv_native module
export function requireJvNative() {
  return requireAddon<
    typeof import('../lib/build/Release/jv_native.node')
  >('../lib/build/Release/jv_native.node');
}