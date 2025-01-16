import Store from "electron-store";
import { createVBTeam } from "../../common/teams.js";
import {
  ElectronStore,
  VBMainConf,
  WindowState,
} from "../../common/electronStore.js";
import { IPCInvokeKeys } from "../../common/constants.js";

// ========= Store =========
export class MainStore {
  private _ipcMain: Electron.IpcMain;
  private _store: Store<ElectronStore>;
  private _handleChangeTranscriber: (config: VBMainConf) => void | undefined;

  constructor({
    ipcMain,
    handleChangeTranscriber,
  }: {
    ipcMain: Electron.IpcMain;
    handleChangeTranscriber: (config: VBMainConf) => void | undefined;
  }) {
    this._store = new Store<ElectronStore>({
      configFileMode: 0o644, // 設定を保存するファイルのパーミッションを -rw-r--r-- に設定する
      defaults: {
        // windowState
        windowState: {
          x: undefined,
          y: undefined,
          width: 800,
          height: 640,
        },

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

        // Team Settings
        teams: {
          state: {
            teams: [createVBTeam("Home")],
          },
          version: 0,
        },
      },
    });
    this._ipcMain = ipcMain;
    this._handleChangeTranscriber = handleChangeTranscriber;

    this._initialize();
  }

  private _initialize() {
    // ========= VA Teams =========
    this._ipcMain.removeAllListeners(IPCInvokeKeys.GET_TEAMS);
    this._ipcMain.handle(IPCInvokeKeys.GET_TEAMS, (e) => {
      try {
        const data = this._store.get("teams");
        console.log("get teams", data);
        return data;
      } catch (err) {
        console.error("error: get teams");
      }
    });

    this._ipcMain.removeAllListeners(IPCInvokeKeys.SET_TEAMS);
    this._ipcMain.handle(IPCInvokeKeys.SET_TEAMS, (e, json: any) => {
      console.log("update teams: 0:", json);
      try {
        this._store.set("teams", json);
      } catch (err) {
        console.error("error: update teams:", json);
      }
    });

    // ========= VA Config =========
    this._ipcMain.removeAllListeners(IPCInvokeKeys.GET_VB_MAIN_STORE);
    this._ipcMain.handle(IPCInvokeKeys.GET_VB_MAIN_STORE, (e) => {
      const conf = this._store.get("conf");
      //console.log("get VA config", conf);
      return conf;
    });

    this._ipcMain.removeAllListeners(IPCInvokeKeys.UPDATE_VA_CONFIG);
    this._ipcMain.handle(
      IPCInvokeKeys.UPDATE_VA_CONFIG,
      (e, conf: VBMainConf) => {
        console.log("update VA config", conf);
        this._store.set("conf", conf);
        if (this._handleChangeTranscriber) {
          this._handleChangeTranscriber(conf);
        }
      }
    );
  }

  public getWindowState() {
    return this._store.get("windowState");
  }

  public setWindowState(windowState: WindowState) {
    this._store.set("windowState", windowState);
  }

  public getConfig() {
    return this._store.get("conf");
  }
}
