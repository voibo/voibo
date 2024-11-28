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
  constructor(options) {
    super(options);
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0][0];
    const buffer = float32ArrayToArrayBuffer(input);
    //this.port.postMessage([buffer, sampleRate]); // convert float data to int16
    this.port.postMessage([input, sampleRate]); // return float data as-is
    return true;
  }
}

function float32ArrayToArrayBuffer(buffer) {
  const samples = buffer.length;
  const array = new ArrayBuffer(samples * 2); // 16bit Int = 2byte
  const view = new DataView(array);
  for (let i = 0; i < samples; i++) {
    view.setInt16(i * 2, float32ToInt16(buffer[i]), true);
  }
  return array;
}

function float32ToInt16(n) {
  // まず、入力値を -1.0 と 1.0 の間に制限します
  const clamped = Math.max(-1, Math.min(1, n));
  // その後、int16の範囲にスケールし、丸めます
  return Math.round(clamped * 0x7fff);
}

registerProcessor("post-pcm-worklet-processor", PostPCMWorkletProcessor);
