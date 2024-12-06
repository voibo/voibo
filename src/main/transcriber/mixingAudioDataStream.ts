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
import { app } from "electron";
import fs from "fs";
import { Readable } from "stream";
import { IPCSenderKeys } from "../../common/constants.js";
//const { app } = require('electron');

export type RequestDesktopBufferCallback = (
  webMicSampleCount: number
) => Float32Array;

export class MixingAudioDataStream extends Readable {
  private _ipcMain: Electron.IpcMain;
  private _ready: boolean = false;
  private _requestDesktopBufferCallback: RequestDesktopBufferCallback | null =
    null;
  private _debug = false;
  private _debugRawFile = false;

  constructor(
    ipcMain: Electron.IpcMain,
    requestDesktopBuffercallback: RequestDesktopBufferCallback
  ) {
    super();
    let ws: fs.WriteStream | undefined = undefined;
    if (this._debugRawFile) {
      const path = app.getPath("userData") + "/test.raw";
      console.log(`writing debug raw PCM file to ${path}/test.raw`);
      ws = fs.createWriteStream(path);
    }
    this._ipcMain = ipcMain;
    this._requestDesktopBufferCallback = requestDesktopBuffercallback;
    this._ipcMain.on(
      IPCSenderKeys.SEND_SOUND_BUFFER, // this event handler is removed in TranscribeFromStreamManager.close()
      (e, webAudioArrayBuffer: ArrayBuffer, sampleRate: number) => {
        if (sampleRate != 16000) {
          console.log(
            `WARNING: MixingAudioDataStream received microphone data at sample rate of ${sampleRate}` +
            ` but desktop audio uses sample rate of 16000. Audio mixing of microphone data and desktop data` +
            ` will fail.`
          );
        }
        if (this._ready && this._requestDesktopBufferCallback != null) {
          let webAudioFloat32 = new Float32Array(webAudioArrayBuffer);
          let desktopAudioFloat32 = this._requestDesktopBufferCallback(
            webAudioFloat32.length
          );

          // determine which array is longer and shorter of the above 2 arrays,
          // webAudioFloat32 and desktopAudioFloat32. Because web audio (microphone)
          // and desktop audio are captured in different threads, even at the same sample
          // rate, there will be slight differences in the exact number of bytes captured
          // into each buffer. we must consume ALL of the captured audio data from both
          // streams, or else the longer array may grow longer and longer, leading to
          // a larger and larger backlog of unconsumed audio data.
          let longerArray: Float32Array = webAudioFloat32;
          let shorterArray: Float32Array = desktopAudioFloat32;
          if (webAudioFloat32.length > desktopAudioFloat32.length) {
            longerArray = webAudioFloat32;
            shorterArray = desktopAudioFloat32;
            if (this._debug) {
              console.log(
                `WARNING: desktop audio underrun, expected ${longerArray.length} but only got ${shorterArray.length}`
              );
            }
          } else if (desktopAudioFloat32.length > webAudioFloat32.length) {
            longerArray = desktopAudioFloat32;
            shorterArray = webAudioFloat32;
            if (this._debug) {
              console.log(
                `WARNING: mic audio underrun, expected ${longerArray.length} but only got ${shorterArray.length}`
              );
            }
          }

          // mix (add) audio data from both the longerArray and the shorterArray.
          // we must consume all data in both longerArray and shorterArray.
          // the end of the shorterArray is padded with zero data.
          // this effectively means that there is a very small audio gap in
          // the end of the captured audio of the shorterArray. because audio
          // processing happens in very small increments of a few hundred samples,
          // this gap will be only a few milliseconds long and will not interfere
          // with the audio quality as required for speech-to-text.

          // WARNING: the below code assumes that both the mic audio and the desktop audio
          // use the same sampling rate (16000) and the same number of channels (1).

          let mergedAudioInt16 = Int16Array.from(
            longerArray.map(
              (longerArrayElement, i) =>
                Math.max(
                  -1, // clamp value such that it is not smaller than -1
                  Math.min(
                    1, // clamp value such that it is not larger than +1

                    // mix web(mic) and desktop audio by adding, and zero-padding shorterArray
                    longerArrayElement +
                    (i < shorterArray.length ? shorterArray[i] : 0)
                  )
                ) *
                2 ** 15 -
                1 // convert to signed int16
            )
          );

          if (this._debugRawFile) {
            let mergedAudioFloat = Float32Array.from(
              mergedAudioInt16,
              (e) => e / 2 ** 15
            );
            ws!.write(Buffer.from(mergedAudioFloat.buffer)); // write merged audio to debug raw PCM file
            //ws.write(Buffer.from(desktopAudioFloat32.buffer)); // write captured desktop audio to debug raw PCM file
            //ws.write(Buffer.from(webAudioFloat32.buffer)); // write captured web mic audio to debug raw PCM file
          }

          let mergedAudioBuffer = Buffer.from(mergedAudioInt16.buffer);
          this.push(mergedAudioBuffer);
        }
      }
    );
  }

  override _read(size: number) {
    this._ready = true;
  }
}
