/*
Copyright 2024 SpiralMind Co., Ltd. & Humanest Ltd. & Spiral Effect

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
//import * as process from 'process';

import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

import path from "path";
import { IPCSenderKeys } from "../../../common/constants.js";
import { AudioDataStream } from "../audioDataStream.js";
import { AudioFormat } from "../spiralmind/va/whisper/AudioFormat.js";
import { TranscribeRequest } from "../spiralmind/va/whisper/TranscribeRequest.js";
import {
  TranscribeResult,
  TranscribeResult__Output,
} from "../spiralmind/va/whisper/TranscribeResult.js";
import { WhisperServiceClient } from "../spiralmind/va/whisper/WhisperService.js";
import { ProtoGrpcType } from "../whisper.js";

const packageDefinition = protoLoader.loadSync(
  path.join(__dirname, "whisper.proto"),
  {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  }
);

const proto = grpc.loadPackageDefinition(
  packageDefinition
) as unknown as ProtoGrpcType;

export class TranscribeFromStreamManager {
  // environment
  _ipcMain: Electron.IpcMain;
  _webContents: Electron.WebContents;
  _getAudioFolderPath: () => string;

  // current transcriber
  _currentOutputFolder: string | null;
  _currentStartTime: number | null;
  _call: grpc.ClientDuplexStream<
    TranscribeRequest,
    TranscribeResult__Output
  > | null = null;
  _stream: AudioDataStream | null = null;

  // whisper
  _whisperClient: WhisperServiceClient | null = null;

  constructor({
    ipcMain,
    webContents,
    getAudioFolderPath,
  }: {
    ipcMain: Electron.IpcMain;
    webContents: Electron.WebContents;
    maxProcessCount?: number;
    getAudioFolderPath: () => string;
  }) {
    this._ipcMain = ipcMain;
    this._webContents = webContents;
    this._getAudioFolderPath = getAudioFolderPath;

    // current transcriber
    this._currentOutputFolder = null;
    this._currentStartTime = null;
    this._call = null;
    this._stream = null;

    this._whisperClient = new proto.spiralmind.va.whisper.WhisperService(
      "unix:/tmp/whisper-server.sock",
      grpc.credentials.createInsecure()
    );

    this._initialize();
  }

  // util

  printResult(result: TranscribeResult) {
    result.segments?.forEach((seg) => {
      const timestamp = seg.timestamp as number;
      const length = seg.length as number;
      const start = this.formatTimestamp(timestamp);
      const end = this.formatTimestamp(timestamp + length);
      console.log(`[${start}] -> [${end}]: ${seg.text}`);
    });
  }

  formatTimestamp(t: number): string {
    const s = t % 60;
    const tmp = Math.trunc(Math.trunc(t) / 60);
    const m = tmp % 60;
    const h = Math.trunc(tmp / 60);

    return `${h.toFixed(0).padStart(3, "0")}:${m
      .toFixed(0)
      .padStart(2, "0")}:${s.toFixed(3).padStart(2, "0")}`;
  }

  // public
  async start(timestamp: number) {
    const Channels = 1;
    const SampleRate = 48000;
    const BitDepth = 16;
    const FrameSizeMs = 100;
    const FrameSize = (FrameSizeMs * SampleRate) / 1000;

    console.log("transcribe start: 0", timestamp, this._whisperClient);
    if (this._whisperClient) {
      console.log("transcribe start: 1", timestamp);
      // ==== whisper ====
      this.close();

      // == prepare ==
      this._stream = new AudioDataStream(this._ipcMain);
      this._call = this._whisperClient.transcribe();
      this._call.on("data", (res) => {
        this.printResult(res);
      });

      // == start transcript ==
      // transcribe initial request
      this._call.write({
        init: {
          timestamp: 0,
          options: {
            initialPrompt: "こんにちは。今日は、よろしくお願いします。",
            language: "ja",
            maxLength: 5000,
            translate: false,
          },
          audioParameters: {
            channels: Channels,
            sampleRate: SampleRate,
            format: AudioFormat.PCM_S16LE,
            frameSize: FrameSize,
          },
        },
      });

      // transcribe audio data
      this._stream.on("data", (data) => {
        if (this._call) {
          console.log("transcribe data", data.length);
          this._call.write({
            data: {
              audioData: {
                data: data,
              },
            },
          });
        }
      });
    }
  }

  private close(): void {
    console.log("transcribe close");
    if (this._stream) {
      this._stream.destroy();
    }
    if (this._call) {
      this._call.end();
    }
  }

  /*
  async stopTranscribe() {
    if (this._call) {
      this._call.end();
      await new Promise<void>((resolve) => {
        if (this._call) {
          this._call.on("end", () => resolve());
        }
      });
    }
  }
  */

  private _initialize() {
    this._ipcMain.removeAllListeners(IPCSenderKeys.START_TRANSCRIBE);
    // timestamp: number for folder name
    this._ipcMain.on(IPCSenderKeys.START_TRANSCRIBE, (e, timestamp: number) => {
      console.log("[main] transcribe start", timestamp);
      try {
        this.start(timestamp);
      } catch (err) {
        console.log(`[main] transcribe: unhandled error`, err);
      }
    });

    this._ipcMain.removeAllListeners(IPCSenderKeys.END_TRANSCRIBE);
    // timestamp: number for folder name
    this._ipcMain.on(
      IPCSenderKeys.RE_TRANSCRIBE_ALL,
      (e, timestamp: number) => {
        console.log("[main] transcribe close", timestamp);
        try {
          this.close();
        } catch (err) {
          console.log(`[main] transcribe close: unhandled error`, err);
        }
      }
    );
  }
}
