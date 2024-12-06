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
import { Readable, Transform } from "stream";
import { Format, isFormat } from "./format.js";
import { audioBufferToUInt16Array2, concatBuffers } from "./utils.js";

export class PCMStream extends Transform implements Format {
  #buf: Buffer;
  #format?: Format;

  get channels(): number {
    return this.#format?.channels ?? 0;
  }

  get sampleRate(): number {
    return this.#format?.sampleRate ?? 0;
  }

  constructor(format?: Format) {
    super({
      objectMode: true,
    });
    this.#buf = Buffer.alloc(0);

    if (format) {
      this.#setFormat(format);
    }

    this.on("pipe", (src: Readable) => {
      if (isFormat(src)) {
        this.#setFormat(src);
      }
      src.on("format", (format) => {
        if (isFormat(src)) {
          this.#setFormat(format);
        }
      });
    });
  }

  #setFormat(format: Format) {
    if (format.channels > 0 && format.sampleRate > 0) {
      this.#format = format;
      this.emit("format", format);
    }
  }

  override _transform(
    chunk: any,
    _: BufferEncoding,
    callback: (error?: Error | null) => void
  ) {
    if (!(chunk instanceof Buffer)) {
      callback(new Error("unsupported input"));
      return;
    }
    if (this.#format == null) {
      callback(new Error("failed to get source format"));
      return;
    }

    const buf = concatBuffers(this.#buf, chunk);
    //const pcm = audioBufferToInt16Array(buf); // original
    const pcm = audioBufferToUInt16Array2(buf); // 32bit float to 16bit int
    this.push(pcm);

    this.#buf = buf.subarray(pcm.length * 4, buf.length); // 32bit float each 4 bytes
    callback();
  }

  override _flush(callback: (error?: Error | null) => void) {
    callback();
  }
}
