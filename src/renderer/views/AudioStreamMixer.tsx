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
/*

// This file is no longer needed because audio stream mixing now occurs in
// the main electron app process, not the web renderer process. the web
// renderer process now sends only the own-microphone stream (not a
// mixed stream with participants microphone) to the main process.
// then the main process uses a nodejs addon to capture desktop audio,
// and the main process does the audio mixing before sending the mixed
// data buffer to the speech-to-text stream.

//////////////////////////////////////////////////////////////////

import JSZip from "jszip";
import { VBSettingsState } from "./setting/VBSettings";

interface AudioStreamMixerOptions {
  channels: number;
  sampleRate: number;
}

class AudioStreamMixer {
  #context: AudioContext;
  #stream: MediaStream;

  constructor(options: AudioStreamMixerOptions, streams: MediaStream[]) {
    this.#context = new AudioContext({
      sampleRate: options.sampleRate,
    });

    // デフォルトの出力デバイスに合成した音声が出力されてしまうので、
    // 出力ボリュームを 0 に設定した GainNode を AudioContext.destination に接続する。
    const zeroGainNode = this.#context.createGain();
    zeroGainNode.gain.value = 0;
    zeroGainNode.connect(this.#context.destination);

    const dst = this.#context.createMediaStreamDestination();

    for (const stream of streams) {
      const source = this.#context.createMediaStreamSource(stream);

      // 出力をモノラルにする
      const channelMerger = this.#context.createChannelMerger(1);
      for (let i = 0; i < source.numberOfOutputs; i++) {
        source.connect(channelMerger, i, 0);
      }

      // ボリューム調整
      const gainNode = this.#context.createGain();
      gainNode.gain.value = 1; // ボリューム調整

      channelMerger.connect(gainNode).connect(dst);
    }

    this.#stream = dst.stream;
  }

  get stream(): MediaStream {
    return this.#stream;
  }

  close() {
    this.#context.close();
  }
}

export class AudioStreamMixerManager {
  private outputContext: AudioContext | undefined;
  private outputAudio: HTMLAudioElement | undefined;
  private mixer: AudioStreamMixer | undefined;
  private participantMicStream: MediaStream | undefined;
  private ownMicStream: MediaStream | undefined;

  private _closeOutputContext(): void {
    if (this.outputContext != null) {
      this.outputContext.close();
      this.outputContext = undefined;
    }
  }

  private _closeOutputAudio(): void {
    if (this.outputAudio != null) {
      this.outputAudio.pause();
      this.outputAudio.srcObject = null;
      this.outputAudio = undefined;
    }
  }

  private _closeMixer(): void {
    if (this.mixer != null) {
      this.mixer.close();
      this.mixer = undefined;
    }
  }

  private _outputStreamContext(stream: MediaStream, deviceId?: string): void {
    this._closeOutputContext();

    interface AudioContextEx extends AudioContext {
      setSinkId: (sinkId: string) => void;
    }

    const ctx = new AudioContext({
      sampleRate: 44100,
    }) as AudioContextEx;

    if (deviceId != null) {
      ctx.setSinkId(deviceId);
    }

    const src = ctx.createMediaStreamSource(stream);
    console.debug("output source channels", src.numberOfOutputs);
    src.connect(ctx.destination);

    this.outputContext = ctx;
  }

  // AudioMixer

  stopAudioMixer(): void {
    this._closeOutputContext();
    this._closeOutputAudio();
    this._closeMixer();
  }

  async startAudioMixer(settingsData: VBSettingsState): Promise<MediaStream> {
    this._closeMixer();

    this.ownMicStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: {
          exact: settingsData.selectedOwnDeviceId,
        },
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    // ノイズキャンセリングなどを全て無効化する
    this.participantMicStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: {
          exact: settingsData.selectedParticipantsDeviceId,
        },
        channelCount: 1,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    this.mixer = new AudioStreamMixer(
      {
        channels: 1,
        sampleRate: 16000,
      },
      [this.ownMicStream, this.participantMicStream]
    );

    this._outputStreamContext(
      this.participantMicStream,
      settingsData.selectedOutputDeviceId
    );

    return this.mixer.stream;
  }

  // record wav for debug
  private recorders: MediaRecorder[] = [];
  async startRecording() {
    if (this.mixer && this.participantMicStream && this.ownMicStream) {
      const streams = [
        this.participantMicStream,
        this.ownMicStream,
        this.mixer.stream,
      ];

      for (const stream of streams) {
        const recorder = new MediaRecorder(stream);
        this.recorders.push(recorder);
        recorder.start();
      }
    }
  }
  async stopRecording() {
    for (const recorder of this.recorders) {
      if (recorder.state !== "inactive") {
        recorder.stop();
      }
    }

    const zip = new JSZip();

    for (let i = 0; i < this.recorders.length; i++) {
      const recorder = this.recorders[i];
      const blob = await new Promise<Blob>((resolve) => {
        recorder.ondataavailable = (event) => {
          resolve(event.data);
        };
      });

      zip.file(`recording-${i}.wav`, blob);
    }

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recordings-${Date.now()}.zip`;
    a.click();

    this.recorders = [];
  }
}

//////////////////////////////////////////////////////////////////

*/
