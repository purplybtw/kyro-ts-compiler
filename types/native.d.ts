
declare module '*/jv_native.node' {
  interface JvNativeModule {
    add: (a: number, b: number) => number;
  }
  
  const jvNativeModule: JvNativeModule;
  export = jvNativeModule;
}

declare module '../lib/build/Release/jv_native.node' {
  interface JvNativeModule {
    add: (a: number, b: number) => number;
  }
  
  const jvNativeModule: JvNativeModule;
  export = jvNativeModule;
}

declare module './lib/build/Release/jv_native.node' {
  interface JvNativeModule {
    add: (a: number, b: number) => number;
  }
  
  const jvNativeModule: JvNativeModule;
  export = jvNativeModule;
}
