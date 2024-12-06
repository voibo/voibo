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
import { Readable } from "stream";
import { IPCSenderKeys } from "../../common/constants.js";

export class AudioDataStream extends Readable {
  private _ipcMain: Electron.IpcMain;
  private _ready: boolean = false;

  constructor(ipcMain: Electron.IpcMain) {
    super();
    this._ipcMain = ipcMain;
    this._ipcMain.on(
      IPCSenderKeys.SEND_SOUND_BUFFER, // this event handler is removed in TranscribeFromStreamManager.close() 
      (e, buffer: ArrayBuffer, sampleRate: number) => {
        if (this._ready) {
          this.push(Buffer.from(buffer));
        }
      }
    );
  }

  override _read(size: number) {
    this._ready = true;
  }
}
