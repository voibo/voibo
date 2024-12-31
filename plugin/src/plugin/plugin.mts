export enum PluginFunctions {
  none = 0,
  testA = 1 << 0,
  testB = 1 << 1,
  all = testA | testB,
}

export abstract class Plugin {
  abstract get name(): string;
  abstract get supportedFunctions(): PluginFunctions;

  hasFunction(functions: PluginFunctions): boolean {
    return (this.supportedFunctions & functions) !== PluginFunctions.none;
  }

  // Transcriber
  testA(): void {
    throw Error("function [testB] is not supported");
  }

  testB(): void {
    throw Error("function [testA] is not supported");
  }

  //
}
