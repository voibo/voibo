import path from "node:path";
import Store from "electron-store";
import { createVBTeam, VBTeam, VBTeams } from "../../common/teams.js";
import {
  ElectronStore,
  VBMainConf,
  WindowState,
} from "../../common/electronStore.js";
import { IPCInvokeKeys } from "../../common/constants.js";
import { StorageValue } from "zustand/middleware";
import { deleteFolder, makeDir } from "../server-util.js";
import {
  getMinutesFolderPath,
  getPluginFolderPath,
} from "../common/pathUtil.js";

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
          transcriber: "stt",
          GOOGLE_STT_KEY_PATH: "",
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
            teams: [],
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
    // If no team is set as default, set the first team as default
    if (this._store.get("teams").state.teams.length === 0) {
      this.setTeams({
        state: {
          teams: [createVBTeam("Home", true)],
          lastSpecialAction: "addTeam",
        },
        version: 0,
      });
    }

    //  Initialize IPCMain
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
    // check that team is added or removed. see useVBTeamStore.tsx
    switch (teams.state.lastSpecialAction) {
      case "addTeam":
        console.log("setTeams: addTeam", teams);
        const addedTeam = teams.state.teams[teams.state.teams.length - 1]; // get the last team
        try {
          makeDir(path.join(getMinutesFolderPath(addedTeam.id)), true);
          makeDir(path.join(getPluginFolderPath(addedTeam.id)), true);
        } catch (err) {
          console.log(`[main] create minutes folder: unhandled error`, err);
        }
        break;
      case "removeTeam":
        console.log("setTeams: removeTeam", teams);
        const removedTeam = this.getTeams().state.teams.find(
          (currentTeam) =>
            teams.state.teams.findIndex((t) => t.id === currentTeam.id) === -1
        );
        if (removedTeam) {
          try {
            deleteFolder(path.join(getMinutesFolderPath(removedTeam.id)));
          } catch (err) {
            console.log(`[main] delete: unhandled error`, err);
          }
        }
        break;
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
