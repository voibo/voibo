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
import { VBMainConf } from "../common/electronStore.js";
import { MainStore } from "./store/mainStore.js";
import { getMinutesFolderPath } from "./common/pathUtil.js";

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

// ==== App ====

app.whenReady().then(() => {
  // load the main store
  const mainStore = new MainStore({
    ipcMain,
    handleChangeTranscriber: (config: VBMainConf) => {
      console.log("change transcriber", config);
      if (transcriber) {
        transcriber.close();
      }
      transcriber = initTranscriber();
    },
  });

  const currentTeam = mainStore.getCurrentTeam();

  // アプリの起動イベント発火で BrowserWindow インスタンスを作成
  const mainWindow = new BrowserWindow({
    title: "Voibo",
    x: mainStore.getWindowState().x,
    y: mainStore.getWindowState().y,
    width: mainStore.getWindowState().width,
    height: mainStore.getWindowState().height,
    minWidth: 640,
    minHeight: 400,
    webPreferences: {
      // webpack が出力したプリロードスクリプトを読み込み
      preload: path.join(__dirname, "preload.js"),
    },
  });

  loadPlugins();

  const getWhisperPath = (): string => {
    return mainStore.getConfig().WHISPER_EXEC_PATH;
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
      return getMinutesFolderPath(currentTeam.id);
    }
  );

  // 指定Minutes を作成する
  ipcMain.on(IPCSenderKeys.CREATE_MINUTES, (e, timestamp: number) => {
    console.log("[main] create minutes folder", timestamp);
    try {
      makeDir(
        path.join(getMinutesFolderPath(currentTeam.id), `${timestamp}`),
        true
      );
    } catch (err) {
      console.log(`[main] create minutes folder: unhandled error`, err);
    }
  });

  // 指定Minutes を削除する
  ipcMain.on(IPCSenderKeys.DELETE_MINUTES, (e, timestamp: number) => {
    console.log("[main] delete minutes", timestamp);
    try {
      deleteFolder(
        path.join(getMinutesFolderPath(currentTeam.id), `${timestamp}`)
      );
    } catch (err) {
      console.log(`[main] delete: unhandled error`, err);
    }
  });

  // ==== Whisper / Speech to text =====
  function initTranscriber(): ITranscribeManager {
    const transcribeType = mainStore.getConfig().transcriber;
    console.log("initTranscriber", transcribeType);
    switch (transcribeType) {
      case "localWav":
        return new TranscribeFromWavManager({
          webContents: mainWindow.webContents,
          ipcMain,
          getAudioFolderPath: getMinutesFolderPath.bind(null, currentTeam.id),
          getWhisperPath,
        });
      case "stt":
      default:
        return new TranscribeFromStreamManager({
          webContents: mainWindow.webContents,
          ipcMain,
          getAudioFolderPath: getMinutesFolderPath.bind(null, currentTeam.id),
          sttParams: {
            projectID: mainStore.getConfig().GOOGLE_TTS_PROJECT_ID,
            credentials: {
              clientEmail: mainStore.getConfig().GOOGLE_TTS_CLIENT_EMAIL,
              privateKey: mainStore.getConfig().GOOGLE_TTS_PRIVATE_KEY,
            },
          },
        });
    }
  }
  let transcriber = initTranscriber();

  // ========= LLM =========
  const llm = new AgentManager({
    ipcMain,
    store: mainStore.getConfig(),
  });

  // load the index.html of the app.
  mainWindow.loadFile("dist/index.html");

  // ==== Main Window Event ====

  // if the url is http or https, open it in the default browser
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

  // before close the window, set the current position and size to the store.
  // Note that you can't get the window status after the window is closed,
  // so you can't get the window status in the 'window-all-closed' event.
  mainWindow.once("close", () => {
    const { x, y, width, height } = mainWindow.getBounds();
    mainStore.setWindowState({
      x,
      y,
      width,
      height,
    });
  });
});

// Quit the app when all windows are closed
app.once("window-all-closed", () => app.quit());
