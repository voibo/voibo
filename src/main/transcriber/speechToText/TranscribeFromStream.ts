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
import { protos, v2 } from "@google-cloud/speech";
import { SpeechClient } from "@google-cloud/speech/build/src/v2";
import Store from "electron-store";
import path from "path";
import { Readable } from "stream";
import { IPCReceiverKeys, IPCSenderKeys } from "../../../common/constants.js";
import { save } from "../../server-util.js";
import { ITranscribeManager } from "../ITranscribeManager.js";
import { ChunkSplitter } from "../audio/chunkSplitter.js";
import { MixingAudioDataStream } from "../mixingAudioDataStream.js";
import { Segment } from "../../../common/discussion.js";
import { RecognizeStream, getErrorCode } from "./RecognizeStream.js";
import { AudioCapture } from "@voibo/desktop-audio-capture";

export type TranscribeFromStreamRequiredParams = Required<{
  webContents: Electron.WebContents;
  inputStream: Readable;
  getAudioFolderPath: () => string;
  store: Store<StoreType>;
}>;

export type TranscribeFromStreamOptionalParams = Partial<{
  // recognizer settings
  location: string;
  recognizer: string;
  // stream settings
  channels: number;
  sampleRate: number;
  bitDepth: number;
  model: string;
  frameSizeMs: number;
}>;
export class TranscribeFromStream {
  private store: Store<StoreType>;
  private lastElapsedMsec: number = 0;
  private lastSegmentElapsedMsec: number = 0;
  private currentStartMsec: number = 0;
  private lastTranscriptInterim: string = "";

  //
  private webContents: Electron.WebContents;
  private inputStream: Readable;
  private getAudioFolderPath: () => string;
  private currentTimestampMsec: number; // 現在処理している Minutes の開始時間

  private location: string;
  private recognizer: string;
  private channels: number;
  private sampleRate: number;
  private bitDepth: number;
  private model: string;
  private frameSizeMs: number;

  private projectID: string;
  private client: SpeechClient;
  private sttStream: RecognizeStream | null;

  // debug
  private segments: Array<{
    timestampMsec: number;
    elapsedMsec: number;
    transcript: string;
    isInterim: boolean;
  }>;

  constructor(
    params: TranscribeFromStreamRequiredParams &
      TranscribeFromStreamOptionalParams
  ) {
    this.store = params.store;
    this.webContents = params.webContents;
    this.inputStream = params.inputStream;
    this.location = params.location ?? "global";
    this.recognizer = params.recognizer ?? "_";
    this.getAudioFolderPath = params.getAudioFolderPath;

    this.channels = params.channels ?? 1;
    this.sampleRate = params.sampleRate ?? 16000;
    this.bitDepth = params.bitDepth ?? 16;
    this.model = params.model ?? "long";
    this.frameSizeMs = params.frameSizeMs ?? 100;

    this.projectID = this.store.get("conf").GOOGLE_TTS_PROJECT_ID ?? "";
    const credentials = {
      credentials: {
        client_email: this.store.get("conf").GOOGLE_TTS_CLIENT_EMAIL ?? "",
        private_key: this.store.get("conf").GOOGLE_TTS_PRIVATE_KEY ?? "",
      },
    };

    console.log(
      "TranscribeFromStream: credentials",
      credentials,
      this.projectID
    );

    this.client = new v2.SpeechClient(credentials);
    this.sttStream = null;

    this.currentTimestampMsec = 0;
    // elapsed time
    this.lastSegmentElapsedMsec = 0;
    this.lastElapsedMsec = 0;

    // debug?
    this.segments = [];
  }

  private get frameSize() {
    return (
      (this.frameSizeMs *
        this.channels *
        this.sampleRate *
        (this.bitDepth / 8)) /
      1000
    );
  }
  private constructPath(): string {
    return path.join(
      this.getAudioFolderPath(),
      `${this.currentTimestampMsec}`,
      `data.json`
    );
  }

  private saveTranscribeLog() {
    save(
      this.constructPath(),
      JSON.stringify(this.segments.filter((s) => !s.isInterim))
    );
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

  private _transcribedFinal(
    timestamp: number,
    lengthMsec: number,
    transcript: string,
    currentEndMsec: number
  ) {
    /*
    console.log(
      "_transcribedFinal",
      currentEndMsec,
      timestamp,
      lengthMsec,
      transcript
    );
    */
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

  private _transcribedInterim(
    timestamp: number,
    lengthMsec: number,
    transcript: string,
    currentEndMsec: number
  ) {
    /*
    console.log(
      "_transcribedInterim",
      currentEndMsec,
      timestamp,
      lengthMsec,
      transcript
    );
    */
    this.lastTranscriptInterim = transcript;

    this.webContents.send(
      IPCReceiverKeys.ON_TRANSCRIBED_INTERIM,
      this._makeSegment({
        timestampMsec: timestamp,
        lengthMsec,
        transcript,
        currentEndMsec,
        isInterim: true,
      })
    );

    this.lastElapsedMsec = currentEndMsec;
  }

  private startStream() {
    this.sttStream = new RecognizeStream({
      speechClient: this.client,
      projectID: this.projectID,
      location: this.location,
      recognizer: this.recognizer,
      streamingConfig: {
        config: {
          explicitDecodingConfig: {
            encoding: "LINEAR16",
            sampleRateHertz: this.sampleRate,
            audioChannelCount: this.channels,
          },
          model: this.model,
          languageCodes: ["ja-JP"],
          features: {
            enableAutomaticPunctuation: true,
            //profanityFilter: true, // 冒涜フィルタはあえて無効にしている。
            //enableWordTimeOffsets: true,
            //enableWordConfidence: true,
          },
        },
        streamingFeatures: {
          enableVoiceActivityEvents: true,
          interimResults: true,
        },
      },
    });

    this.sttStream.on(
      "data",
      (response: protos.google.cloud.speech.v2.IStreamingRecognizeResponse) => {
        response.results?.forEach((result) => {
          if (
            result.alternatives != null &&
            result.alternatives.length > 0 &&
            result.resultEndOffset &&
            result.resultEndOffset.seconds != null &&
            result.resultEndOffset.nanos != null
          ) {
            const currentEndMsec =
              (Number(result.resultEndOffset.seconds || 0) * 1_000_000_000 +
                Number(result.resultEndOffset.nanos || 0)) /
              1_000_000;
            const transcript = result.alternatives[0].transcript ?? "";
            if (result.isFinal) {
              this._transcribedFinal(
                this.currentStartMsec + this.lastSegmentElapsedMsec,
                currentEndMsec - this.lastSegmentElapsedMsec,
                transcript,
                currentEndMsec
              );
            } else if (
              result.stability != null &&
              result.stability > 0.7 &&
              this.lastTranscriptInterim.length <=
                result.alternatives[0].transcript!.length
            ) {
              this._transcribedInterim(
                this.currentStartMsec + this.lastSegmentElapsedMsec,
                currentEndMsec - this.lastElapsedMsec,
                transcript,
                currentEndMsec
              );
            }
          }
        });
      }
    );

    this.sttStream.on("error", (err) => {
      switch (getErrorCode(err)) {
        case 10: // ABORTED
        case 13: // INTERNAL
          console.error("stream error: restart", err);
          if (this.sttStream) {
            this.sttStream.restartStream();
          }
          break;
        default:
          console.error("stream error", err);
        //throw err; // 例外を投げると、プロセスが終了するのでlogだけにしておく
      }
    });

    this.sttStream.on("end", () => {
      console.log("stream end");
    });

    this.inputStream
      .pipe(new ChunkSplitter(this.frameSize))
      .pipe(this.sttStream);
  }

  public start(currentTimestampMsec: number) {
    this.currentTimestampMsec = currentTimestampMsec;
    this.currentStartMsec = Date.now() - this.currentTimestampMsec;
    console.log("STT: TranscribeFromStream start", currentTimestampMsec);
    this.startStream();
  }

  public stop() {
    this.saveTranscribeLog();
    // close
    this.inputStream.unpipe();
    if (this.sttStream) {
      this.sttStream.push(null);
      this.sttStream.end();
    }
    console.log("STT: TranscribeFromStream stop");
  }
}

export class TranscribeFromStreamManager implements ITranscribeManager {
  // environment
  private _ipcMain: Electron.IpcMain;
  private _webContents: Electron.WebContents;
  private _getAudioFolderPath: () => string;
  private _store: Store<StoreType>;
  private _desktopAudioBuffer: number[] = new Array(0);
  private _capture: any;
  private _captureIteration = 0;
  private _captureDisplayId = 1;
  private _debug = false;

  // current transcriber
  private _transcriber: TranscribeFromStream | null;
  private _inputStream: Readable;

  constructor({
    ipcMain,
    webContents,
    getAudioFolderPath,
    store,
  }: {
    ipcMain: Electron.IpcMain;
    webContents: Electron.WebContents;
    getAudioFolderPath: () => string;
    store: Store<StoreType>;
  }) {
    this._ipcMain = ipcMain;
    this._webContents = webContents;
    this._getAudioFolderPath = getAudioFolderPath;
    this._transcriber = null;
    this._store = store;

    this._capture = new AudioCapture();
    this._capture.on("error", (error: any) => {
      console.error(error);
    });
    this._capture.on("data", (data: any) => {
      const float32Array = new Float32Array(data);
      this._desktopAudioBuffer.push(...float32Array);
    });

    // create an inputStream here and re-use it, instead of recreating it
    // each time on START_TRANSCRIBE.
    this._inputStream = new MixingAudioDataStream(
      this._ipcMain,
      this._requestDesktopBufferCallback.bind(this)
    );

    let asyncInitialization = async () => {
      const [displays, windows] = await AudioCapture.enumerateDesktopWindows();
      if (displays.length > 0) {
        this._captureDisplayId = displays[0].displayId;
      }

      // only after assigning this._captureDisplayId (with await above),
      // then call this._initialize() which will use this._captureDisplayId

      this._initialize();
    };
    asyncInitialization();
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

    // NOTE: it is incorrect to use "requiredBufferLen = availableDesktopSampleCount;"
    // because this will cause major audio gaps in both the desktop audio buffer and
    // the microphone audio buffer. if we incorrectly attempt to return ALL available
    // desktop samples (more than the requested number of webMicSampleCount), then this
    // will immediately cause a large gap in the mic audio due to the larger amount of
    // desktop audio. then, the next several mic audio requests will try to catch up
    // and request the desktop audio, but the desktop audio was already consumed, thus
    // now causing a gap in the desktop audio. this can be confirmed by monitoring the
    // desktop buffer underruns and the mic buffer underruns in MixingAudioDataStream,
    // and by writing the mixed audio result to a raw PCM file and listening to the
    // audible gaps and stuttering caused by this approach.

    // however, there is also an alternative logic (commented out) below.

    // in case the microphone data is *always* skipping data (due to slow processing and
    // small  buffer size in the web app), then there will be more desktop audio data than
    // web microphone data. this means that the desktop audio buffer will slowly
    // increase in size because the slow (and skipping) microphone data stream
    // prevents faster consumption of the larger quantity of data in the desktop audio buffer.

    // as a workaround, the below code can be used to force this callback to push
    // SLIGHTLY MORE desktop audio data back to the rqeuester, to reduce the backlog in the
    // desktop audio buffer. this will cause a corresponding small gap in the microphone data
    // (during the stream mixing logic that combines the mic audio and desktop audio buffers).

    // however, current testing shows that if the web-side microphone's AudioContext
    // is created with the latencyHint of "playback" (not "interactive"), then this will
    // increase the web-side microphone audio buffer such that microphone data dropouts
    // do not occur. there may be occasional backlogs and temporary increases in the
    // size of the desktop audio buffer, but the backlog always (during testing) decreased
    // back down to near zero, after a few seconds. therefore, test results show for now
    // that it is not necessary to use the below workaround code.

    /*
    
    // check if the backlog of unprocessed desktop audio samples is too large.
    // if yes, this indicates the consumer is not consuming the desktop audio
    // quickly enough, so we must force more data, bit by bit, back to the requester.
    if(availableDesktopSampleCount > 5000) {
       console.log(`WARN: desktop backlog detected of ${availableDesktopSampleCount}, increasing consumption rate`);
      requiredBufferLen = webMicSampleCount * 1.x; // return slightly more data, e.g. 1.1 times, than was requested, because the mic data is skipping
      if(requiredBufferLen > availableDesktopSampleCount) {
          requiredBufferLen = availableDesktopSampleCount;
      }
    } else {
      // backlog is small enough, so only return the requested number of samples
      // without any extra.
      requiredBufferLen = webMicSampleCount;
    }
    */

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
          channels: 1,
          sampleRate: 16000,
          displayId: this._captureDisplayId,
        });

        this._transcriber = new TranscribeFromStream({
          webContents: this._webContents,
          inputStream: this._inputStream, // reuse inputStream instead of recreating it
          getAudioFolderPath: this._getAudioFolderPath,
          store: this._store,
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
