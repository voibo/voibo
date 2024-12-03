import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Plugin, PluginFunctions } from '../plugin/plugin.mjs';
import { PluginManager } from '../manager/manager.mjs';

class TestPluginA extends Plugin {
  get name(): string {
    return 'test-a';
  }

  get supportedFunctions(): PluginFunctions {
    return PluginFunctions.testA;
  }

  override testA(): void {
  }
}

class TestPluginB extends Plugin {
  get name(): string {
    return 'test-b';
  }

  get supportedFunctions(): PluginFunctions {
    return PluginFunctions.testB;
  }

  override testB(): void {
  }
}

describe('PluginManager', () => {
  const manager = new PluginManager();

  const pluginA = new TestPluginA();
  const pluginB = new TestPluginB();

  it('register(): shoud not throw errors', () => {
    manager.register(pluginA);
    manager.register(pluginB);
  });

  it('pluginCount: shoud return plugin count', () => {
    assert.strictEqual(manager.pluginCount, 2);
  });

  it('plugins(): should return an iterable that iterates over the two plugins', () => {
    const iter = manager.plugins()[Symbol.iterator]();

    assert.deepEqual(iter.next(), { done: false, value: pluginA });
    assert.deepEqual(iter.next(), { done: false, value: pluginB });
    assert.deepEqual(iter.next(), { done: true, value: undefined });
  })
});
