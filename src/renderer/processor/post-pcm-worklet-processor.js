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
class PostPCMWorkletProcessor extends AudioWorkletProcessor {
  #channels;
  #sliceSamples;
  #buffer;
  #dataView;
  #byteOffset;
  #firstFrame;
  #currentFrame;

  constructor(options) {
    super(options);
    this.#channels = 1;
    const timeslice = options.processorOptions.timeslice;
    this.#sliceSamples = Math.trunc(
      (timeslice * sampleRate * this.#channels) / 1000
    );

    const bufferLength = this.#sliceSamples * 4;
    this.#buffer = new ArrayBuffer(bufferLength);
    this.#dataView = new DataView(this.#buffer);
    this.#byteOffset = 0;
    this.#firstFrame = -1;
    this.#currentFrame = -1;
  }

  process(inputs, outputs, parameters) {
    if (this.#firstFrame < 0) {
      this.#firstFrame = currentFrame;
    }
    if (this.#currentFrame < 0) {
      this.#currentFrame =
        currentFrame - this.#firstFrame - this.#byteOffset / 4;
    }
    const input = inputs[0][0];

    let inputOffset = 0;
    while (inputOffset < input.length) {
      let copyByteLength = this.#buffer.byteLength - this.#byteOffset;
      let copySamples = copyByteLength / 4;
      const remaining = input.length - inputOffset;
      if (remaining < copySamples) {
        copySamples = remaining;
        copyByteLength = remaining * 4;
      }
      for (let i = 0; i < copySamples; i++) {
        const value = input[inputOffset + i];
        this.#dataView.setFloat32(this.#byteOffset + i * 4, value, false);
      }
      this.#byteOffset += copyByteLength;
      inputOffset += copySamples;

      if (this.#byteOffset >= this.#buffer.byteLength) {
        const channels = inputs[0].length;
        this.port.postMessage([this.#buffer, sampleRate, this.#currentFrame]);
        this.#byteOffset = 0;
        this.#currentFrame = -1;
      }
    }
    return true;
  }
}

registerProcessor("post-pcm-worklet-processor", PostPCMWorkletProcessor);
