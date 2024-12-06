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
import * as gax from "google-gax";
import { Transform, TransformCallback } from "stream";

const streamingLimit = 280000;

export interface RecognizeStreamConfig {
  speechClient: v2.SpeechClient;
  projectID: string;
  location?: string;
  recognizer?: string;
  streamingConfig: protos.google.cloud.speech.v2.IStreamingRecognitionConfig;
}

export class RecognizeStream extends Transform {
  #client: v2.SpeechClient;
  #request: protos.google.cloud.speech.v2.IStreamingRecognizeRequest;
  #stream?: gax.CancellableStream;
  #timeoutID?: NodeJS.Timeout;

  #restartCounter = 0;
  #audioInput: Buffer[] = [];
  #lastAudioInput: Buffer[] = [];
  #resultEndTime = 0;
  #isFinalEndTime = 0;
  #finalRequestEndTime = 0;
  #newStream = true;
  #bridgingOffset = 0;

  constructor({
    speechClient,
    projectID,
    location = "global",
    recognizer = "_",
    streamingConfig,
  }: RecognizeStreamConfig) {
    super({
      objectMode: true,
    });

    this.#client = speechClient;
    this.#request = {
      recognizer: `projects/${projectID}/locations/${location}/recognizers/${recognizer}`,
      streamingConfig: streamingConfig,
    };

    this.#startStream();
  }

  override _transform(
    chunk: Buffer,
    _: BufferEncoding,
    callback: TransformCallback
  ) {
    if (this.#stream == null) {
      return;
    }
    if (this.#newStream) {
      this.#stream.write(this.#request);

      if (this.#lastAudioInput.length > 0) {
        // チャンクの時間を計算するための近似計算
        const chunkTime = streamingLimit / this.#lastAudioInput.length;
        if (chunkTime > 0) {
          if (this.#bridgingOffset < 0) {
            this.#bridgingOffset = 0;
          }
          if (this.#bridgingOffset > this.#finalRequestEndTime) {
            this.#bridgingOffset = this.#finalRequestEndTime;
          }
          const chunksFromMS = Math.floor(
            (this.#finalRequestEndTime - this.#bridgingOffset) / chunkTime
          );
          this.#bridgingOffset = Math.floor(
            (this.#lastAudioInput.length - chunksFromMS) * chunkTime
          );

          for (let i = chunksFromMS; i < this.#lastAudioInput.length; i++) {
            this.#stream?.write({ audio: this.#lastAudioInput[i] });
          }
        }
      }
      this.#newStream = false;
    }

    this.#audioInput.push(chunk);

    this.#stream?.write({ audio: chunk });

    callback();
  }

  override _flush(callback: TransformCallback) {
    callback();
  }

  override _final(callback: TransformCallback) {
    if (this.#timeoutID != null) {
      clearTimeout(this.#timeoutID);
    }
    this.#closeStream();
    callback();
  }

  #startStream() {
    this.#stream = this.#client
      ._streamingRecognize()
      .on("error", (err) => {
        if (
          getErrorCode(err) === 11 || // 11: UNAVAILABLE
          getErrorCode(err) === 10 || //  10: ABORTED
          getErrorCode(err) === 1 //  1: CANCELLED
        ) {
          this.#restartStream();
        } else {
          this.emit("error", err);
        }
      })
      .on("data", (res) => this.#speechCallback(res));

    this.#timeoutID = setTimeout(() => this.#restartStream(), streamingLimit);
  }

  restartStream() {
    this.#restartStream();
  }

  #closeStream() {
    if (this.#stream != null) {
      this.#stream.end();
      this.#stream.removeAllListeners("data");
      this.#stream.removeAllListeners("error");
      this.#stream = undefined;
    }
  }

  #restartStream() {
    this.#closeStream();

    if (this.#resultEndTime > 0) {
      this.#finalRequestEndTime = this.#isFinalEndTime;
    }
    this.#resultEndTime = 0;

    this.#lastAudioInput = [];
    this.#lastAudioInput = this.#audioInput;
    this.#audioInput = [];

    this.#restartCounter++;
    this.#newStream = true;

    this.#startStream();
  }

  #speechCallback(
    response: protos.google.cloud.speech.v2.IStreamingRecognizeResponse
  ) {
    if ((response.results?.length ?? 0) == 0) {
      return;
    }
    const result = response.results![0];

    // result end time を 秒 + ナノ秒 から ミリ秒に変換する
    this.#resultEndTime = millisecondsFromDuration(result.resultEndOffset);

    // 2回送信されたオーディオからのオフセットに基づいて正しい時間を計算する
    const correctedTime =
      this.#resultEndTime -
      this.#bridgingOffset +
      streamingLimit * this.#restartCounter;
    result.resultEndOffset = durationFromMilliseconds(correctedTime);

    if (result.isFinal) {
      this.#isFinalEndTime = this.#resultEndTime;
    }

    // 結果を書き込む
    this.push(response);
  }
}

export function getErrorCode(error: unknown): number | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as Record<string, unknown>).code === "number"
  ) {
    return (error as Record<string, number>).code;
  } else {
    return null;
  }
}

function millisecondsFromDuration(
  d?: protos.google.protobuf.IDuration | null
): number {
  if (d == null) {
    return 0;
  }
  return Number(d.seconds ?? 0) * 1000 + Math.round((d.nanos ?? 0) / 1000000);
}

function durationFromMilliseconds(
  milliseconds: number
): protos.google.protobuf.IDuration {
  const seconds = Math.trunc(milliseconds / 1000);
  const nanos = (milliseconds % 1000) * 1000000;
  return {
    seconds: seconds.toFixed(),
    nanos: nanos,
  };
}
