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
import { Transform, TransformCallback } from "stream";

export class ChunkSplitter extends Transform {
  #chunkSize: number;
  #buffer: Buffer;

  constructor(chunkSize: number) {
    super();

    this.#chunkSize = chunkSize;
    this.#buffer = Buffer.alloc(0);
  }

  override _transform(
    chunk: any,
    _: BufferEncoding,
    callback: TransformCallback
  ) {
    this.#buffer = Buffer.concat([this.#buffer, chunk]);

    while (this.#buffer.length >= this.#chunkSize) {
      this.push(this.#buffer.subarray(0, this.#chunkSize));
      this.#buffer = this.#buffer.subarray(this.#chunkSize);
    }

    callback();
  }

  override _flush(callback: TransformCallback) {
    if (this.#buffer.length > 0) {
      this.push(this.#buffer);
    }

    callback();
  }
}
