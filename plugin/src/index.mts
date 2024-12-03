export {
  Plugin,
  PluginFunctions,
} from './plugin/plugin.mjs';

import {
  PluginManager,
} from './manager/manager.mjs';

const pluginManager = new PluginManager();

export {
  PluginManager,
  pluginManager,
}
