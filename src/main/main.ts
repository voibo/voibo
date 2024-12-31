/*
Copyright 2024 Voibo

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import console from "console";
import crypto from "crypto";
import {
  BrowserWindow,
  app,
  ipcMain,
  session,
  shell,
  systemPreferences,
} from "electron";
import log from "electron-log/main.js";
import * as os from "os";
import * as process from "node:process";

import Store from "electron-store";
import path from "node:path";
import { IPCInvokeKeys, IPCSenderKeys } from "../common/constants.js";
import { AgentManager } from "./agent/agentManager.js";
import {
  deleteFolder,
  loadDialogSelectedFile,
  makeDir,
} from "./server-util.js";
import { ITranscribeManager } from "./transcriber/ITranscribeManager.js";
import { TranscribeFromWavManager } from "./transcriber/localWhisper/TranscribeFromWav.js";
import { TranscribeFromStreamManager } from "./transcriber/speechToText/TranscribeFromStream.js";

import { PluginFunctions, pluginManager } from "@voibo/voibo-plugin";

async function loadPlugins() {
  const pluginPath = path.resolve(
    process.cwd(),
    "./examples/plugins/test-plugin/dist/index.mjs"
  );

  await import(/* webpackIgnore: true */ pluginPath);

  for (const p of pluginManager.plugins()) {
    console.debug("loaded plugin:", p.name);
    if (p.hasFunction(PluginFunctions.testA)) {
      pluginManager.callTestA(p.name);
    }
  }
}

// Prototype

// ========= Log =========
log.initialize({ preload: true });
/*
// console.logをelectron-logで置き換える
console.log = log.log;
console.error = log.error;
console.warn = log.warn;
console.info = log.info;
*/
process.on("uncaughtException", (err) => {
  log.error("electron:event:uncaughtException");
  log.error(err);
  log.error(err.stack);
  app.quit();
});

// ========= Store =========
// ストアのインスタンスを作成する (TS の場合の型は StoreType)
const store = new Store<StoreType>({
  /**
   * 設定を保存するファイルのパーミッションを
   * -rw-r--r-- に設定する
   */
  configFileMode: 0o644,
  defaults: {
    // ウィンドウのデフォルトサイズや座標
    x: undefined,
    y: undefined,
    width: 800,
    height: 640,

    // VA Config
    conf: {
      transcriber: "localWav",
      GOOGLE_TTS_PROJECT_ID: "",
      GOOGLE_TTS_CLIENT_EMAIL: "",
      GOOGLE_TTS_PRIVATE_KEY: "",
      WHISPER_EXEC_PATH: "",

      //  == LLM ==
      OPENAI_API_KEY: "",
      ANTHROPIC_API_KEY: "",
      GROQ_API_KEY: "",
      GOOGLE_API_KEY: "",
    },
  },
});

// ==== App ====

app.whenReady().then(() => {
  // アプリの起動イベント発火で BrowserWindow インスタンスを作成
  const mainWindow = new BrowserWindow({
    title: "Voibo",
    x: store.get("x"),
    y: store.get("y"),
    width: store.get("width"),
    height: store.get("height"),
    minWidth: 640,
    minHeight: 400,
    webPreferences: {
      // webpack が出力したプリロードスクリプトを読み込み
      preload: path.join(__dirname, "preload.js"),
    },
  });

  loadPlugins();

  // === Util ===

  const getMinutesFolderPath = (): string => {
    return path.join(app.getPath("userData"), "minutes", "/");
  };
  console.log("minutes folder path", getMinutesFolderPath());

  const getWhisperPath = (): string => {
    return store.get("conf").WHISPER_EXEC_PATH;
  };

  // ==== Device Permission ====
  if (os.platform() == "win32") {
    // windows code for allowing microphone access

    let status = systemPreferences.getMediaAccessStatus("microphone");
    session
      .fromPartition("default")
      .setPermissionRequestHandler((webContents, permission, callback) => {
        let allowedPermissions = ["audioCapture", "desktopCapture"]; // Full list here: https://developer.chrome.com/extensions/declare_permissions#manifest

        if (allowedPermissions.includes(permission)) {
          callback(true); // Approve permission request
        } else {
          console.error(
            `The application tried to request permission for '${permission}'. This permission was not whitelisted and has been blocked.`
          );
          callback(false); // Deny
        }
      });
  } else {
    // for mac or other platform (linux), use mac-based code
    systemPreferences.askForMediaAccess("microphone").then((isAllowed) => {
      if (isAllowed) {
        //connectLocalCamera();
      }
    });
  }

  // ==== Nonce & permit to run VAD wasm on renderer ====
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  mainWindow.webContents.session.webRequest.onHeadersReceived(
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [
            `worker-src 'self' blob:`,
            "script-src 'self' 'unsafe-eval' http://localhost:8097/ https://cdn.jsdelivr.net blob:", // for VAD wasm
            `style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net`,
            "base-uri 'self'",
            "object-src 'self'",
            "frame-src 'self'",
          ],
        },
      });
    }
  );

  // ==== IPC ====
  // nonce をレンダラープロセスに渡す
  ipcMain.handle(IPCInvokeKeys.GET_NONCE, async (): Promise<string> => nonce);

  // File Dialog を開く
  ipcMain.handle(IPCInvokeKeys.OPEN_FILE_DIALOG, loadDialogSelectedFile);

  // Audio Folder Path を渡す
  ipcMain.handle(
    IPCInvokeKeys.GET_AUDIO_FOLDER_PATH,
    async (): Promise<string> => {
      return getMinutesFolderPath();
    }
  );

  // 指定Minutes を作成する
  ipcMain.on(IPCSenderKeys.CREATE_MINUTES, (e, timestamp: number) => {
    console.log("[main] create minutes folder", timestamp);
    try {
      makeDir(path.join(getMinutesFolderPath(), `${timestamp}`), true);
    } catch (err) {
      console.log(`[main] create minutes folder: unhandled error`, err);
    }
  });

  // 指定Minutes を削除する
  ipcMain.on(IPCSenderKeys.DELETE_MINUTES, (e, timestamp: number) => {
    console.log("[main] delete minutes", timestamp);
    try {
      deleteFolder(path.join(getMinutesFolderPath(), `${timestamp}`));
    } catch (err) {
      console.log(`[main] delete: unhandled error`, err);
    }
  });

  // ==== Whisper / Speech to text =====
  function initTranscriber(): ITranscribeManager {
    const transcribeType = store.get("conf").transcriber;
    console.log("initTranscriber", transcribeType);
    switch (transcribeType) {
      case "localWav":
        return new TranscribeFromWavManager({
          webContents: mainWindow.webContents,
          ipcMain,
          getAudioFolderPath: getMinutesFolderPath,
          getWhisperPath,
        });
      case "stt":
      default:
        return new TranscribeFromStreamManager({
          webContents: mainWindow.webContents,
          ipcMain,
          getAudioFolderPath: getMinutesFolderPath,
          store,
        });
    }
  }
  let transcriber = initTranscriber();

  // ========= VA Config =========
  ipcMain.removeAllListeners(IPCInvokeKeys.GET_VB_MAIN_STORE);
  ipcMain.handle(IPCInvokeKeys.GET_VB_MAIN_STORE, (e) => {
    const conf = store.get("conf");
    //console.log("get VA config", conf);
    return conf;
  });

  ipcMain.removeAllListeners(IPCInvokeKeys.UPDATE_VA_CONFIG);
  ipcMain.handle(IPCInvokeKeys.UPDATE_VA_CONFIG, (e, conf: VBMainConf) => {
    console.log("update VA config", conf);
    store.set("conf", conf);
    if (transcriber) {
      transcriber.close();
    }
    transcriber = initTranscriber();
  });

  // ========= LLM =========

  const llm = new AgentManager({
    ipcMain,
    store,
  });

  // レンダラープロセスをロード
  mainWindow.loadFile("dist/index.html");

  // ==== Main Window Event ====

  /**
   * url が http または https で始まる場合はフォルトブラウザで開く
   */
  mainWindow.webContents.on("will-navigate", (event, url) => {
    event.preventDefault();
    if (url.startsWith("http") || url.startsWith("https")) {
      shell.openExternal(url);
    }
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    const { url } = details;
    console.log("setWindowOpenHandler", url);
    if (url.startsWith("http") || url.startsWith("https")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  // アプリが閉じられるときの処理
  mainWindow.once("close", () => {
    /**
     * ウィンドウが閉じられる（寸前の）段階で
     * 現在の位置やサイズをストアにセットする
     *
     * 閉じられた**後**に発火する 'window-all-closed' イベントでは
     * ウィンドウステータスを取得できないことに注意
     */
    const { x, y, width, height } = mainWindow.getBounds();
    store.set({
      x,
      y,
      width,
      height,
    });
  });
});

// すべてのウィンドウが閉じられたらアプリを終了する
app.once("window-all-closed", () => app.quit());
