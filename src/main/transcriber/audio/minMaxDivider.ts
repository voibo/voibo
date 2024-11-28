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
import { Transform } from "stream";
import { Format } from "./format.js";
import { isSegment } from "./silenceDivider.js";

export interface MinMaxDividerOptions {
  format: Format;
  maxLength: number; // sec
  minLength: number; // sec
}

export class MinMaxDivider extends Transform {
  #opts: MinMaxDividerOptions;
  #format?: Format;

  #offset: number; // 現在位置
  #segmentBuf?: Int16Array;
  #segmentOffset: number;

  // config
  #maxSamples: number;
  #minSamples: number;

  get channels(): number {
    return this.#format?.channels ?? 0;
  }

  get sampleRate(): number {
    return this.#format?.sampleRate ?? 0;
  }

  constructor(opts: MinMaxDividerOptions) {
    super({
      objectMode: true,
    });

    this.#opts = opts;
    this.#format = opts.format; // directly set
    this.#segmentBuf = undefined;
    this.#segmentOffset = -1;
    this.#offset = 0;

    // config
    this.#maxSamples = Math.trunc(this.#opts.maxLength * this.sampleRate);
    this.#minSamples = Math.trunc(this.#opts.minLength * this.sampleRate);
    if (this.#maxSamples < this.#minSamples) {
      const tmp = this.#maxSamples;
      this.#maxSamples = this.#minSamples;
      this.#minSamples = tmp;
    }
  }

  override _transform(
    chunk: any,
    _: BufferEncoding,
    callback: (error?: Error | null) => void
  ) {
    if (!(chunk instanceof Array && chunk.every(isSegment))) {
      callback(new Error("unsupported input"));
      return;
    }

    for (let chunkOffset = 0; chunkOffset < chunk.length; chunkOffset++) {}
    this.#offset += chunk.length;

    callback();
  }

  override _flush(callback: (error?: Error | null) => void) {
    callback();
  }
}
