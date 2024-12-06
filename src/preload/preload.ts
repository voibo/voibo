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
import { IpcRendererEvent, contextBridge, ipcRenderer } from "electron";
import { IPCInvokeKeys, IPCReceiverKeys, IPCSenderKeys } from "../common/constants.js";

export interface IElectronAPI {
  // renderer -> main
  send: (channel: IPCSenderKeys, ...args: any[]) => void;

  // main -> renderer
  on: (
    channel: IPCReceiverKeys,
    listener: (event: IpcRendererEvent, ...args: any[]) => void,
    removeBefore?: boolean
  ) => () => void;

  // renderer -> main -> renderer
  invoke: (channel: IPCInvokeKeys, ...args: any[]) => Promise<any>;
}

/**
 * window.electron でアクセスできる
 */
contextBridge.exposeInMainWorld("electron", {
  // renderer -> main
  send: (channel: IPCSenderKeys, ...args: any[]) => {
    ipcRenderer.send(channel, ...args);
  },

  // main -> renderer
  on: (
    channel: IPCReceiverKeys,
    listener: (event: IpcRendererEvent, ...args: any[]) => void,
    removeBefore = true
  ) => {
    if (removeBefore) ipcRenderer.removeAllListeners(channel);
    ipcRenderer.on(channel, (event: IpcRendererEvent, ...args: any[]) =>
      listener(event, ...args)
    );
    return () => {
      ipcRenderer.removeAllListeners(channel);
    };
  },

  // renderer -> main -> renderer
  invoke: (channel: IPCInvokeKeys, ...args: any[]) => {
    return ipcRenderer.invoke(channel, ...args);
  },
});
