import Store from "electron-store";
import {
  createVBTeam,
  VBTeam,
  VBTeams,
  VBTeamsElectronStore,
} from "../../common/teams.js";
import {
  ElectronStore,
  VBMainConf,
  WindowState,
} from "../../common/electronStore.js";
import { IPCInvokeKeys } from "../../common/constants.js";
import { StorageValue } from "zustand/middleware";

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
      configFileMode: 0o644, // set permission to -rw-r--r-- for the config file
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
            teams: [createVBTeam("Home", true)],
            lastSpecialAction: undefined,
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
    this._ipcMain.removeAllListeners(IPCInvokeKeys.GET_CURRENT_TEAM);
    this._ipcMain.handle(
      IPCInvokeKeys.GET_CURRENT_TEAM,
      this.getCurrentTeam.bind(this)
    );

    this._ipcMain.removeAllListeners(IPCInvokeKeys.GET_TEAMS);
    this._ipcMain.handle(IPCInvokeKeys.GET_TEAMS, this.getTeams.bind(this));

    this._ipcMain.removeAllListeners(IPCInvokeKeys.SET_TEAMS);
    this._ipcMain.handle(
      IPCInvokeKeys.SET_TEAMS,
      (e, value: StorageValue<VBTeams>) => this.setTeams(value)
    );

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

  public getCurrentTeam(): VBTeam {
    const team = this.getTeams().state.teams.find(
      (team) => team.isDefault === true
    );
    if (team) return team;
    // expect the first team to be the default team
    return team ? team : this.getTeams().state.teams[0];
  }

  public getTeams(): StorageValue<VBTeams> {
    return this._store.get("teams");
  }

  public setTeams(teams: StorageValue<VBTeams>) {
    console.log("setTeams", teams);
    // check that team is added or removed.
    switch (teams.state.lastSpecialAction) {
      case "":
    }

    this._store.set("teams", teams);
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
