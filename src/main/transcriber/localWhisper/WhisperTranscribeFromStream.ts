import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { Readable } from "stream";
import path from "path";
import { IPCReceiverKeys, IPCSenderKeys } from "../../../common/constants.js";
import { save } from "../../server-util.js";
import { ITranscribeManager } from "../ITranscribeManager.js";
import {
  AudioOutputFormat,
  MixingAudioDataStream,
} from "../mixingAudioDataStream.js";
import { Segment } from "../../../common/discussion.js";
import { MediaCaptureManager } from "../MediaCaptureManager.js";
import { MediaCaptureTargetType } from "@voibo/desktop-media-capture";

export type WhisperTranscribeFromStreamParams = {
  webContents: Electron.WebContents;
  inputStream: Readable;
  getAudioFolderPath: () => string;
  pythonScriptPath: string;
};

export class WhisperTranscribeFromStream {
  private webContents: Electron.WebContents;
  private inputStream: Readable;
  private getAudioFolderPath: () => string;
  private currentStartMsec: number; // recording start time
  private currentTimestampMsec: number; // current minutes timestamp

  private lastElapsedMsec: number = 0;
  private lastSegmentElapsedMsec: number = 0;
  private lastTranscriptInterim: string = "";

  private pythonScriptPath: string;
  private pythonProcess: ChildProcessWithoutNullStreams | null = null;
  // Debug log of received segments
  private segments: Array<any> = [];

  constructor(params: WhisperTranscribeFromStreamParams) {
    this.webContents = params.webContents;
    this.inputStream = params.inputStream;
    this.getAudioFolderPath = params.getAudioFolderPath;
    this.pythonScriptPath = params.pythonScriptPath;

    this.currentStartMsec = 0;
    this.currentTimestampMsec = 0;
  }

  private _makeSegment(props: {
    timestampMsec: number;
    lengthMsec: number;
    transcript: string;
    currentEndMsec: number;
    isInterim: boolean;
  }): {
    id: string;
    segments: Segment[];
  } {
    this.segments.push({
      elapsedMsec: props.currentEndMsec,
      timestampMsec: props.timestampMsec,
      transcript: props.transcript,
      isInterim: props.isInterim,
    });
    return {
      id: `${props.timestampMsec}`,
      segments: [
        {
          timestamp: props.timestampMsec / 1000,
          length: props.lengthMsec,
          texts: [
            {
              timestamp: props.timestampMsec / 1000,
              length: props.lengthMsec,
              text: props.transcript,
            },
          ],
        },
      ],
    };
  }

  private _transcribed(
    timestamp: number,
    lengthMsec: number,
    transcript: string,
    currentEndMsec: number
  ) {
    console.log(
      "_transcribed",
      currentEndMsec,
      timestamp,
      lengthMsec,
      transcript
    );

    this.webContents.send(IPCReceiverKeys.ON_TRANSCRIBED, [
      this._makeSegment({
        timestampMsec: timestamp,
        lengthMsec,
        transcript,
        currentEndMsec,
        isInterim: false,
      }),
    ]);

    this.lastSegmentElapsedMsec = currentEndMsec;
    this.lastElapsedMsec = currentEndMsec;
    this.lastTranscriptInterim = "";
  }

  public start(timestamp: number) {
    this.currentTimestampMsec = timestamp;
    this.currentStartMsec = Date.now() - this.currentTimestampMsec;

    // Spawn the python process that uses Silero VAD + MLX Whisper
    const pythonScriptPath = this.pythonScriptPath;
    this.pythonProcess = spawn(`${pythonScriptPath}/venv/bin/python3`, [
      `${pythonScriptPath}/mlx_whisper_stream.py`,
    ]);

    // Listen for stdout data from python process (expects JSON lines)
    this.pythonProcess.stdout.on("data", (data: Buffer) => {
      const lines = data.toString().split("\n");
      for (const line of lines) {
        if (line.trim()) {
          console.log("Python output:", line);
          try {
            const result = JSON.parse(line);
            const currentEndMsec = Number(result.end || 0) * 1_000;
            const transcript = result.text ?? "";
            this._transcribed(
              this.currentStartMsec + this.lastSegmentElapsedMsec,
              currentEndMsec - this.lastSegmentElapsedMsec,
              transcript,
              currentEndMsec
            );
          } catch (err) {
            console.error("Error parsing python output:", err);
          }
        }
      }
    });

    this.pythonProcess.stderr.on("data", (data: Buffer) => {
      console.error("Python error:", data.toString());
    });

    this.pythonProcess.on("close", (code) => {
      console.log("Python process closed with code:", code);
    });

    // Pipe audio stream data to the python process stdin
    this.inputStream.pipe(this.pythonProcess.stdin);
  }

  public stop() {
    // Stop piping audio data
    this.inputStream.unpipe();
    if (this.pythonProcess) {
      this.pythonProcess.stdin.end();
    }
    this.saveTranscribeLog();
    console.log("Local transcribe stopped");
  }

  private saveTranscribeLog() {
    const filePath = path.join(
      this.getAudioFolderPath(),
      this.currentTimestampMsec.toString(),
      "local_transcribe_log.json"
    );
    save(filePath, JSON.stringify(this.segments));
  }
}

export class WhisperTranscribeFromStreamManager implements ITranscribeManager {
  // environment
  private _ipcMain: Electron.IpcMain;
  private _webContents: Electron.WebContents;
  private _getAudioFolderPath: () => string;
  private _desktopAudioBuffer: number[] = new Array(0);
  private _capture: MediaCaptureManager;
  private _captureIteration = 0;
  private _debug = false;

  // current transcriber
  private _transcriber: WhisperTranscribeFromStream | null;
  private _inputStream: Readable;
  private _params: Map<string, string | number | boolean | undefined>;

  constructor({
    ipcMain,
    webContents,
    getAudioFolderPath,
    params,
  }: {
    ipcMain: Electron.IpcMain;
    webContents: Electron.WebContents;
    getAudioFolderPath: () => string;
    params: Map<string, string | number | boolean | undefined>;
  }) {
    this._ipcMain = ipcMain;
    this._webContents = webContents;
    this._getAudioFolderPath = getAudioFolderPath;
    this._transcriber = null;
    this._params = params;

    this._capture = new MediaCaptureManager({
      ipcMain: this._ipcMain,
      webContents: this._webContents,
      desktopAudioBuffer: this._desktopAudioBuffer,
      minutesFolderPath: this._getAudioFolderPath(),
    });

    // create an inputStream here and re-use it, instead of recreating it
    // each time on START_TRANSCRIBE.
    this._inputStream = new MixingAudioDataStream(
      this._ipcMain,
      this._requestDesktopBufferCallback.bind(this),
      {
        debugRawFile: true,
        outputFormat: AudioOutputFormat.FLOAT32_MONO,
      }
    );

    // 初期化処理
    this._initialize();
  }

  private _requestDesktopBufferCallback(webMicSampleCount: number) {
    let availableDesktopSampleCount = this._desktopAudioBuffer.length;

    if (this._debug) {
      this._captureIteration++;
      if (this._captureIteration % 100 == 0) {
        this._captureIteration = 0;
        console.log(
          `STAT: desktop audio buffer: ${this._desktopAudioBuffer.length}`
        );
      }
      if (availableDesktopSampleCount < webMicSampleCount) {
        console.log(
          `WARNING: desktop audio underflow in requestDesktopBufferCallback, ` +
            `wanted ${webMicSampleCount} but only got ${availableDesktopSampleCount} ` +
            `desktop samples`
        );
      }
    }

    // returns a portion of pending audio in the desktop audio buffer,
    // corresponding to exactly the number of samples collected from the
    // web app's microphone.
    let requiredBufferLen = 0;
    requiredBufferLen = webMicSampleCount;

    let desktopAudioFloatData = new Float32Array(requiredBufferLen); // initializes entire array to 0 values
    desktopAudioFloatData.set(
      this._desktopAudioBuffer.splice(0, requiredBufferLen)
    );
    return desktopAudioFloatData;
  }

  private _initialize() {
    this._ipcMain.removeAllListeners(IPCSenderKeys.START_TRANSCRIBE);
    // timestamp: number for folder name
    this._ipcMain.on(IPCSenderKeys.START_TRANSCRIBE, (e, timestamp: number) => {
      console.log("[main] transcribe start", timestamp);
      try {
        this._desktopAudioBuffer.length = 0;

        this._capture.startCapture({
          currentTimestamp: timestamp,
        });

        this._transcriber = new WhisperTranscribeFromStream({
          webContents: this._webContents,
          inputStream: this._inputStream, // reuse inputStream instead of recreating it
          getAudioFolderPath: this._getAudioFolderPath,
          pythonScriptPath: this._params.get("pythonScriptPath") as string,
        });
        this._transcriber.start(timestamp);
      } catch (err) {
        console.log(`[main] transcribe: unhandled error`, err);
      }
    });

    this._ipcMain.on(
      IPCSenderKeys.END_TRANSCRIBE,
      async (e, timestamp: number) => {
        console.log("[main] transcribe end", timestamp);
        try {
          if (this._transcriber) this._transcriber.stop();
          await this._capture.stopCapture();
        } catch (err) {
          console.log(`[main] transcribe end: unhandled error`, err);
        }
      }
    );
  }

  close() {
    this._ipcMain.removeAllListeners(IPCSenderKeys.START_TRANSCRIBE);
    this._ipcMain.removeAllListeners(IPCSenderKeys.END_TRANSCRIBE);
    this._ipcMain.removeAllListeners(IPCSenderKeys.SEND_SOUND_BUFFER); // added in constructor of MixingAudioDataStream or AudioDataStream
    // NOTE: assume that audio capture already correctly finished stopping
    // during above handling of the END_TRANSCRIBE message above. therefore,
    // we do no extra cleanup processing here in close().
  }
}
