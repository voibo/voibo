import { Plugin, PluginFunctions, pluginManager } from "@voibo/voibo-plugin";

class Test extends Plugin {
  constructor() {
    super();
    console.debug('[plugin:Test] test() is initialized');
  }

  get name(): string {
    return "test";
  }

  get supportedFunctions(): PluginFunctions {
    return PluginFunctions.testA;
  }

  override testA(): void {
    console.debug('[plugin:Test] testA() is called');
  }
}

pluginManager.register(new Test());
