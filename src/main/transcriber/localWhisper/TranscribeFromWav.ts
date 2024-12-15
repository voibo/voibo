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
import { ExecFileException, execFile } from "child_process";
import * as fs from "fs";
import * as os from "os";
import { IPCReceiverKeys, IPCSenderKeys } from "../../../common/constants.js";
import { save } from "../../server-util.js";
import { ITranscribeManager } from "../ITranscribeManager.js";
import { Segment, Text } from "../../../common/discussion.js";

// ==== For Server Side Only ====

export class TranscribeFromWav {
  // environment
  _webContents: Electron.WebContents;
  _localWhisperRunning: boolean;
  _getMinutesFolderPath: () => string;
  _getWhisperPath: () => string;

  // current call
  _currentOutputFolder: string | null;
  _currentStartTime: number;
  _transcribedState: Map<string, "stored" | "processing" | "done">;

  constructor({
    webContents,
    getMinutesFolderPath,
    getWhisperPath,
  }: {
    webContents: Electron.WebContents;
    getMinutesFolderPath: () => string;
    getWhisperPath: () => string;
  }) {
    // environment
    this._webContents = webContents;
    this._getMinutesFolderPath = getMinutesFolderPath;
    this._getWhisperPath = getWhisperPath;
    this._localWhisperRunning = false;

    // current call
    this._currentOutputFolder = null;
    this._currentStartTime = 0;
    this._transcribedState = new Map<
      string,
      "stored" | "processing" | "done"
    >();
  }

  private _transcribe(target?: {
    startSecList: Array<string>;
    pathList: Array<string>;
  }) {
    target = target ?? this._getNotTranscribedWAVs();
    console.log(`_transcribe: target:`, target);

    // 対象となったものに対して、一気に transcribe を実行
    // 最大数の制御は一旦考えない
    if (target.startSecList.length > 0 && !this._localWhisperRunning) {
      const requestedList: Array<any> = [];
      target.startSecList.map((startSec) => {
        console.log(`onRequest: ID: ${startSec}:`);
        // render process に transcribe 中を送信
        requestedList.push({
          id: startSec,
          timestamp: Number(startSec),
        });
        // transcribe 中の状態を保存
        this._transcribedState.set(startSec, "processing");
      });
      this._webContents.send(
        IPCReceiverKeys.REQUESTED_TRANSCRIBE,
        requestedList
      );

      // このリクエストを処理する
      this._transcribeWithLocalWhisper(
        target.pathList,
        (error: ExecFileException | null, stdout: string, stderr: string) => {
          this._handleTranscribed(error, stdout, stderr);
        }
      );
    }
  }

  private _handleTranscribed(
    error: ExecFileException | null,
    stdout: string,
    stderr: string
  ): void {
    this._localWhisperRunning = false;
    if (error) {
      console.log("_handleTranscribed: error:", error);
    }
    if (stderr) {
      console.error(`_handleTranscribed: stderr:`, stderr);
    }
    // render process に結果を送信
    const results: Array<{
      id: string;
      segments: Array<Segment>;
    }> = [];
    const clonedState = Array.from(this._transcribedState); // _transcribedState　の value を変更するので、コピーを作成
    clonedState.forEach((data) => {
      const [key, value] = data;
      // key を startTime に高精度に変換
      const startTime = Number(key); //sec
      if (value === "processing") {
        // 該当JSONを読み込む
        try {
          const json = JSON.parse(
            fs.readFileSync(
              `${this._currentOutputFolder}${key}.wav.json`,
              "utf-8"
            )
          );
          // 読み込んだJSONを整形
          const texts: Array<Text> = [];
          json.transcription.forEach((text: any) => {
            texts.push({
              timestamp: startTime + Number(text.offsets.from) / 1000, // sec
              length: Number(text.offsets.to) - Number(text.offsets.from), // msec?
              text: text.text,
            });
          });

          // 送信用に整形
          if (texts.length > 0) {
            results.push({
              id: key,
              segments: [
                {
                  timestamp: texts[0].timestamp,
                  length: texts.reduce(
                    (acc, cur) => acc + Number(cur.length),
                    0
                  ),
                  texts: texts,
                },
              ],
            });
          }

          // transcribe 中の状態を保存
          this._transcribedState.set(key, "done");
        } catch (e) {
          console.log(`_handleTranscribed: error:`, e);
        }
      }
    });

    if (results.length > 0) {
      console.log(`_handleTranscribed: send:`);
      this._webContents.send(IPCReceiverKeys.ON_TRANSCRIBED, results);

      // 残っていれば、再度 transcribe を実行
      this._transcribe();
    }
  }

  private _transcribeWithLocalWhisper(
    pathList: Array<string>,
    callBack: (
      error: ExecFileException | null,
      stdout: string,
      stderr: string
    ) => void
  ): void {
    this._localWhisperRunning = true;
    const whisperPath: string = this._getWhisperPath();
    let whisperMain = "main";
    if (os.platform() == "win32") {
      whisperMain = whisperMain + ".exe";
    }
    execFile(
      `${whisperPath}/${whisperMain}`,
      [
        "-oj",
        "-l",
        "ja",
        "-m",
        `${whisperPath}/models/ggml-large-v3.bin`,
        "--prompt",
        "こんにちは。今日は、よろしくお願いします。", // 句読点で区切ることをwhisperに指示する。
        "-f",
        ...pathList,
      ],
      callBack
    );
  }

  private _getNotTranscribedWAVs(): {
    startSecList: Array<string>;
    pathList: Array<string>;
  } {
    if (this._currentOutputFolder == null) {
      return { startSecList: [], pathList: [] };
    }
    const targetIDs: Array<string> = Array.from(this._transcribedState)
      .filter((data) => data[1] === "stored")
      .map((data) => data[0]);

    const targetPaths: Array<string> = [];
    targetIDs.reduce((acc, cur) => {
      acc.push(`${this._currentOutputFolder}${cur}.wav`);
      return acc;
    }, targetPaths);

    return { startSecList: targetIDs, pathList: targetPaths };
  }

  // == public methods ==

  start(currentTimestamp: number): void {
    // setup output folder
    const audioFolderPath = this._getMinutesFolderPath();
    this._currentStartTime = currentTimestamp;
    this._currentOutputFolder = `${audioFolderPath}${this._currentStartTime}/`;
    //makeDir(path.resolve(this._currentOutputFolder), true); // create minutes folder で実施済み

    // setup transcribed state
    this._transcribedState = new Map<
      string,
      "stored" | "processing" | "done"
    >();
  }

  pushByWavData(data: Buffer, timestamp: number) {
    if (this._currentOutputFolder != null) {
      console.log(`pushByWavData: ${timestamp}`);
      const pastTimestamp = timestamp - this._currentStartTime;
      const pastSec = pastTimestamp / 1000;

      // このWAVを書き出す
      const filePath = `${this._currentOutputFolder}${String(pastSec)}.wav`;
      save(filePath, data);
      this._transcribedState.set(String(pastSec), "stored");
      this._webContents.send(IPCReceiverKeys.PREPARE_TRANSCRIBE, [
        {
          id: String(pastSec),
          timestamp: Number(pastSec),
        },
      ]);

      // 対象フォルダの中身を確認し、このWAVを含めて、処理対象すべてを取得
      this._transcribe();
    }
  }

  /**
   * 対象となる議事録すべてを再度 transcribe する
   *
   * @param targetTimestamp
   */
  reTranscribeAll(targetTimestamp: number): void {
    // setup output folder
    this.start(targetTimestamp); // 対象フォルダは存在しているので、フォルダには何もしないはず

    // target を取得
    if (this._currentOutputFolder != null) {
      const targetIDs: Array<string> = fs
        .readdirSync(this._currentOutputFolder, {
          withFileTypes: true,
        })
        .filter((dirent) => dirent.isFile() && dirent.name.endsWith(".wav"))
        .map((dirent) => dirent.name.replace(".wav", ""))
        .sort((a, b) => a.localeCompare(b));
      const targetPaths: Array<string> = targetIDs.map(
        (id) => `${this._currentOutputFolder}${id}.wav`
      );

      this._transcribe({
        startSecList: targetIDs,
        pathList: targetPaths,
      });
    }
  }
}

export class TranscribeFromWavManager implements ITranscribeManager {
  // environment
  _ipcMain: Electron.IpcMain;
  _webContents: Electron.WebContents;
  _getAudioFolderPath: () => string;
  _getWhisperPath: () => string;

  // current transcriber
  _transcriber: TranscribeFromWav | null;

  constructor({
    ipcMain,
    webContents,
    getAudioFolderPath,
    getWhisperPath,
  }: {
    ipcMain: Electron.IpcMain;
    webContents: Electron.WebContents;
    getAudioFolderPath: () => string;
    getWhisperPath: () => string;
  }) {
    this._ipcMain = ipcMain;
    this._webContents = webContents;
    this._getAudioFolderPath = getAudioFolderPath;
    this._getWhisperPath = getWhisperPath;

    // current transcriber
    this._transcriber = null;
    this._initialize();
  }

  private _initialize() {
    this._ipcMain.removeAllListeners(IPCSenderKeys.START_TRANSCRIBE);
    // timestamp: number for folder name
    this._ipcMain.on(IPCSenderKeys.START_TRANSCRIBE, (e, timestamp: number) => {
      console.log("[main] transcribe start", timestamp);
      try {
        this._transcriber = new TranscribeFromWav({
          webContents: this._webContents,
          getMinutesFolderPath: this._getAudioFolderPath,
          getWhisperPath: this._getWhisperPath,
        });
        this._transcriber.start(timestamp);
      } catch (err) {
        console.log(`[main] transcribe: unhandled error`, err);
      }
    });

    this._ipcMain.removeAllListeners(IPCSenderKeys.PUSH_WAV);
    // data: ArrayBuffer( WAV data )
    this._ipcMain.on(IPCSenderKeys.PUSH_WAV, (e, wavData: ArrayBuffer) => {
      const timestamp = Date.now();
      console.log("[main] push wav", timestamp);
      try {
        this._transcriber?.pushByWavData(Buffer.from(wavData), timestamp);
      } catch (err) {
        console.log(`[main] push wav: unhandled error`, err);
      }
    });

    this._ipcMain.removeAllListeners(IPCSenderKeys.RE_TRANSCRIBE_ALL);
    // timestamp: number for folder name
    this._ipcMain.on(
      IPCSenderKeys.RE_TRANSCRIBE_ALL,
      (e, timestamp: number) => {
        console.log("[main] re-transcribe all start", timestamp);
        try {
          this._transcriber = new TranscribeFromWav({
            webContents: this._webContents,
            getMinutesFolderPath: this._getAudioFolderPath,
            getWhisperPath: this._getWhisperPath,
          });
          this._transcriber.reTranscribeAll(timestamp);
        } catch (err) {
          console.log(`[main] re-transcribe all: unhandled error`, err);
        }
      }
    );
  }

  close() {
    this._ipcMain.removeAllListeners(IPCSenderKeys.START_TRANSCRIBE);
    this._ipcMain.removeAllListeners(IPCSenderKeys.PUSH_WAV);
    this._ipcMain.removeAllListeners(IPCSenderKeys.RE_TRANSCRIBE_ALL);
  }
}
