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

export enum AudioOutputFormat {
  INT16_MONO = "int16_mono", // 現在のデフォルト
  FLOAT32_MONO = "float32_mono", // 新しいモード
  FLOAT32_STEREO = "float32_stereo", // マイク・デスクトップ分離モード
}

export class MixingAudioDataStream extends Readable {
  private _ipcMain: Electron.IpcMain;
  private _ready: boolean = false;
  private _requestDesktopBufferCallback: RequestDesktopBufferCallback | null =
    null;
  private _debug = false;
  private _debugRawFile = false;
  private _outputFormat: AudioOutputFormat = AudioOutputFormat.INT16_MONO; // デフォルト

  constructor(
    ipcMain: Electron.IpcMain,
    requestDesktopBuffercallback: RequestDesktopBufferCallback,
    options?: {
      debug?: boolean;
      debugRawFile?: boolean;
      outputFormat?: AudioOutputFormat;
    }
  ) {
    super();

    // オプション設定
    if (options) {
      if (options.debug !== undefined) this._debug = options.debug;
      if (options.debugRawFile !== undefined)
        this._debugRawFile = options.debugRawFile;
      if (options.outputFormat) this._outputFormat = options.outputFormat;
    }

    let ws: fs.WriteStream | undefined = undefined;
    if (this._debugRawFile) {
      const path = app.getPath("userData") + "/test.raw";
      const formatDesc =
        this._outputFormat === AudioOutputFormat.INT16_MONO
          ? "s16le"
          : this._outputFormat === AudioOutputFormat.FLOAT32_MONO
          ? "f32le"
          : "f32le -ch_layout stereo"; // ステレオの場合

      console.log(
        `writing debug raw PCM file to ${path}. Check: ffplay -f ${formatDesc} -ar 16000 -i "${path}"`
      );
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

          // 出力フォーマットに応じた処理
          switch (this._outputFormat) {
            case AudioOutputFormat.INT16_MONO:
              // 既存の処理を維持
              let mergedAudioInt16 = Int16Array.from(
                longerArray.map(
                  (longerArrayElement, i) =>
                    Math.max(
                      -1,
                      Math.min(
                        1,
                        longerArrayElement +
                          (i < shorterArray.length ? shorterArray[i] : 0)
                      )
                    ) *
                      2 ** 15 -
                    1
                )
              );

              if (this._debugRawFile) {
                ws!.write(Buffer.from(mergedAudioInt16.buffer));
              }

              this.push(Buffer.from(mergedAudioInt16.buffer));
              break;

            case AudioOutputFormat.FLOAT32_MONO:
              // Float32のまま出力
              let mergedAudioFloat32 = Float32Array.from(
                longerArray.map((longerArrayElement, i) =>
                  Math.max(
                    -1,
                    Math.min(
                      1,
                      longerArrayElement +
                        (i < shorterArray.length ? shorterArray[i] : 0)
                    )
                  )
                )
              );

              if (this._debugRawFile) {
                ws!.write(Buffer.from(mergedAudioFloat32.buffer));
              }

              this.push(Buffer.from(mergedAudioFloat32.buffer));
              break;

            case AudioOutputFormat.FLOAT32_STEREO:
              // ステレオ（チャンネル分離）で出力
              // マイクとデスクトップを別チャンネルに配置
              let stereoAudioFloat32 = new Float32Array(longerArray.length * 2);
              for (let i = 0; i < longerArray.length; i++) {
                // チャンネル1（左）：マイク（または対応する配列）
                stereoAudioFloat32[i * 2] =
                  i < webAudioFloat32.length ? webAudioFloat32[i] : 0;

                // チャンネル2（右）：デスクトップ（または対応する配列）
                stereoAudioFloat32[i * 2 + 1] =
                  i < desktopAudioFloat32.length ? desktopAudioFloat32[i] : 0;
              }

              if (this._debugRawFile) {
                ws!.write(Buffer.from(stereoAudioFloat32.buffer));
              }

              this.push(Buffer.from(stereoAudioFloat32.buffer));
              break;
          }
        }
      }
    );
  }

  override _read(size: number) {
    this._ready = true;
  }

  // 出力フォーマットを取得・設定するメソッド
  getOutputFormat() {
    return this._outputFormat;
  }

  setOutputFormat(format: AudioOutputFormat) {
    this._outputFormat = format;
    return this;
  }
}
