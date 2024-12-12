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
import { MicVAD, utils } from "@ricky0123/vad-web";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { IPCReceiverKeys, IPCSenderKeys } from "../../../common/constants.js";
import { Segment } from "../../../common/Segment.js";
import { CaptureClient } from "../../lib/capture.js";
import { CaptureClientBinary } from "../../lib/captureBinary.js";
import { appendMinutesList } from "../discussion/DiscussionSegment.jsx";
import { splitMinutes } from "../topic/DiscussionSplitter.jsx";
import { useVBMainStore } from "./useVBMainStore.jsx";
import { useVBSettingsStore } from "./useVBSettingStore.jsx";
import { useVBStore } from "./useVBStore.jsx";
import { useMinutesStore } from "./useMinutesStore.jsx";

export type TranscribeState = {
  // vad
  vad: MicVAD | null;

  // media steam
  client: CaptureClient | CaptureClientBinary | null;
  stream: MediaStream | null;
};

export type TranscribeAction = {
  startTranscribe: () => Promise<void>;
  stopTranscribe: () => void;
  splitTranscribe: () => void;
};

export type TranscribeStore = TranscribeState & TranscribeAction;

export const useTranscribeStore = create<TranscribeStore>()(
  subscribeWithSelector((set, get) => ({
    // state
    vad: null,
    client: null,
    stream: null,
    mixer: null,
    recording: false,

    // actions
    startTranscribe: async (): Promise<void> => {
      try {
        const startTimestamp =
          useVBStore.getState().startTimestamp ?? Date.now();
        const settingsData = useVBSettingsStore.getState();
        console.log("startRecording", settingsData);

        if (settingsData && settingsData._hasHydrated) {
          // closeAudio
          get().vad?.destroy();
          get()
            .stream?.getTracks()
            .forEach((track) => track.stop());
          get().client?.close();

          // startAudio
          const unmixedOwnMicStream = await navigator.mediaDevices.getUserMedia(
            {
              audio: {
                deviceId: {
                  exact: settingsData.selectedOwnDeviceId,
                },
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
            }
          );

          let newClient = null;
          let vad = null;

          switch (useVBMainStore.getState().conf!.transcriber) {
            case "localWav":
              vad = await MicVAD.new({
                stream: unmixedOwnMicStream,
                frameSamples: 1536,
                positiveSpeechThreshold: settingsData.positiveSpeechThreshold,
                negativeSpeechThreshold: settingsData.negativeSpeechThreshold,
                preSpeechPadFrames: settingsData.preSpeechPadFrames,
                minSpeechFrames: settingsData.minSpeechFrames,
                redemptionFrames: settingsData.redemptionFrames,
                onSpeechEnd: (audio: any) => {
                  console.log("Send wav to server");
                  window.electron.send(
                    IPCSenderKeys.PUSH_WAV,
                    utils.encodeWAV(audio, 1, 16000, 1, 16)
                  );
                },
              });
              break;
            case "stt":
            default:
              newClient = new CaptureClientBinary({
                track: unmixedOwnMicStream.getAudioTracks()[0],
                modulePath: "post-pcm-worklet-processor-binary.js",
                handleMessage: (...data) => {
                  window.electron.send(
                    IPCSenderKeys.SEND_SOUND_BUFFER,
                    ...data
                  );
                },
              });
              await newClient.start();
              break;
          }

          window.electron.send(IPCSenderKeys.START_TRANSCRIBE, startTimestamp, {
            silenceLevel: settingsData.silenceLevel,
            silenceLength: settingsData.silenceLength,
            maxLength: settingsData.maxLength,
            minLength: settingsData.minLength,
          });

          if (vad) {
            vad.start();
          }

          console.log("start Recording", startTimestamp);
          useVBStore.setState({
            startTimestamp: startTimestamp,
            recording: true,
          });
          set({
            client: newClient,
            stream: unmixedOwnMicStream,
            vad: vad,
          });
        }
      } catch (err) {
        console.error(err);
      }
    },

    stopTranscribe: () => {
      console.log("stopTranscribe");

      // closeAudio
      get()
        .stream?.getTracks()
        .forEach((track) => track.stop());
      get().client?.close();
      // get().vad?.destroy(); // TODO: VAD は再利用のために敢えて残す。本来はアプリ終了時に破棄すべし。

      // stopAudio on main process
      window.electron.send(IPCSenderKeys.END_TRANSCRIBE);

      // reset
      // interim が設定されている場合には、最後の interim を message に変換する
      const interimSegment = useVBStore.getState().interimSegment;

      useVBStore.setState({ recording: false, interimSegment: null });
      set({
        client: null,
        stream: null,
        //vad: null, // TODO: VAD は再利用のために敢えて残す。本来はアプリ終了時に破棄すべし。
      });

      if (interimSegment) {
        setMinutesLines([interimSegment]);
      }
    },

    splitTranscribe: () => {
      get().stopTranscribe();
      get().startTranscribe();
    },
  }))
);

function setMinutesLines(segments: Segment[]) {
  const minutesStore = useMinutesStore(
    useVBStore.getState().startTimestamp
  ).getState();
  const newMinutes = splitMinutes(
    appendMinutesList(segments, minutesStore.discussion, 5),
    minutesStore.discussionSplitter.duration
  );
  //console.log("setMinutesLines", newMinutes, segments);
  useVBStore.getState().vbDispatch({
    type: "setMinutesLines",
    payload: {
      minutes: newMinutes.minutes,
    },
  });
}

// == ON Transcribe ==

window.electron.on(
  IPCReceiverKeys.ON_TRANSCRIBED,
  (
    event: any,
    responses: Array<{
      id: string;
      segments: Segment[];
    }>
  ) => {
    const segments: Segment[] = [];
    responses.map((res) => {
      segments.push(...res.segments);
    });
    setMinutesLines(segments);
  }
);

window.electron.on(
  IPCReceiverKeys.ON_TRANSCRIBED_INTERIM,
  (
    event: any,
    response: {
      id: string;
      segments: Segment[];
    }
  ) => {
    //console.log("ON_TRANSCRIBED_INTERIM", response.id, response.segments)
    useVBStore.getState().vbDispatch({
      type: "updateInterimSegment",
      payload: {
        segment: response.segments[0],
      },
    });
  }
);
