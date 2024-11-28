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
type AudioSinkOptionsType = "none";

interface AudioSinkOptions {
  type: AudioSinkOptionsType;
}

interface CustomAudioContextOptions extends AudioContextOptions {
  sinkId?: AudioSinkOptions | string;
}

export interface CaptureClientBinaryConfig {
  track: MediaStreamTrack;
  modulePath: string;
  handleMessage: (...args: any[]) => void;
}

export class CaptureClientBinary {
  #modulePath: string;
  #stream: MediaStream;
  #context: AudioContext;
  #channels: number;
  #handleMessage: (...args: any[]) => void;

  constructor({ track, handleMessage, modulePath }: CaptureClientBinaryConfig) {
    this.#modulePath = modulePath;
    this.#channels = 1;
    this.#handleMessage = handleMessage;
    this.#stream = new MediaStream([track]);
    const options: CustomAudioContextOptions = {
      sinkId: {
        type: "none",
      },
      sampleRate: 16000,
      latencyHint: "playback", // must be "playback" and not "interactive", for larger buffer size
    };
    this.#context = new AudioContext(options);
    // use below debugging statement to check latency difference between
    // latencyHint:"playback" and latencyHint:"interactive".
    // latencyHint:"playback" should have higher latency, which implies
    // a higher buffer size, which is what we want to avoid dropouts
    // or skipping of mic data due to a too-small buffer. there is no
    // way to specify the buffer size directly, only indirectly through
    // the latencyHint.
    //console.log(`BASE LATENCY: ${this.#context.baseLatency}`);
  }

  async start() {
    const source = this.#context.createMediaStreamSource(this.#stream);
    await this.#context.audioWorklet.addModule(this.#modulePath ?? "");

    const worklet = new AudioWorkletNode(
      this.#context,
      "post-pcm-worklet-processor",
      {
        channelCount: this.#channels,
      }
    );
    // HACK: addEventListener を使用するとイベントが発生しないため、onmessage を使用する。
    worklet.port.onmessage = (ev: MessageEvent<any>) => {
      // pcm の中身 ArrayBuffer。 （int16 ⇒ 2byte毎に１サンプル）
      const [pcm, sampleRate] = ev.data;
      this.#handleMessage(pcm, sampleRate);
    };

    source.connect(worklet);
    worklet.connect(this.#context.destination);
  }

  close() {
    this.#context.close();
  }
}
