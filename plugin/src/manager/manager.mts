import { PluginFunctions, Plugin } from "../plugin/plugin.mjs";

export class PluginManager {
  constructor() {
    this.#plugins = new Map<string, Plugin>();
  }

  #plugins: Map<string, Plugin>;

  get pluginCount(): number {
    return this.#plugins.size;
  }

  getPlugin(name: string): (Plugin | undefined) {
    return this.#plugins.get(name);
  }

  *plugins(functions: PluginFunctions = PluginFunctions.all): Iterable<Plugin> {
    for (const [_, plugin] of this.#plugins) {
      const funcs = plugin.supportedFunctions;
      if ((funcs & functions) !== PluginFunctions.none) {
        yield plugin;
      }
    }
  }

  register(plugin: Plugin) {
    this.#plugins.set(plugin.name, plugin);
  }

  callTestA(name: string): void {
    const p = this.#mustGetPlugin(name);
    this.#checkPluginFunction(p, PluginFunctions.testA);

    p.testA();
  }

  callTestB(name: string): void {
    const p = this.#mustGetPlugin(name);
    this.#checkPluginFunction(p, PluginFunctions.testA);

    p.testB();
  }

  #mustGetPlugin(name: string): Plugin {
    const p = this.#plugins.get(name);
    if (p == null) {
      throw new Error("unknown plugin");
    }
    return p;
  }

  #checkPluginFunction(p: Plugin, functions: PluginFunctions): void {
    if (!p.hasFunction(functions)) {
      throw new Error(`plugin [${p.name}] does not support function [${PluginFunctions[functions]}]`);
    }
  }
}
