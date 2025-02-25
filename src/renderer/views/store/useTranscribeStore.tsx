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
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { IPCReceiverKeys, IPCSenderKeys } from "../../../common/constants.js";
import { Segment } from "../../../common/discussion.js";
import { CaptureClient } from "../../lib/capture.js";
import { CaptureClientBinary } from "../../lib/captureBinary.js";
import { appendMinutesList } from "../../../common/discussion.js";
import { DiscussionSegment } from "../../../common/discussion.js";
import { useVBStore } from "./useVBStore.jsx";
import { useMinutesStore } from "./useMinutesStore.jsx";
import { processDiscussionAction } from "../action/DiscussionAction.js";
import { processVBAction } from "../action/VBAction.js";
import { useVBTeamStore } from "./useVBTeamStore.jsx";

export type TranscribeState = {
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
    client: null,
    stream: null,
    mixer: null,
    recording: false,

    // actions
    startTranscribe: async (): Promise<void> => {
      if (useVBStore.getState().isNoMinutes()) return;
      try {
        const startTimestamp = useVBStore.getState().startTimestamp;
        const team = useVBTeamStore.getState().getHydratedCurrentTeam();
        const settingsData = team.audioDeviceSettings;

        if (settingsData) {
          // closeAudio
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

          let newClient = new CaptureClientBinary({
            track: unmixedOwnMicStream.getAudioTracks()[0],
            modulePath: "post-pcm-worklet-processor-binary.js",
            handleMessage: (...data) => {
              window.electron.send(IPCSenderKeys.SEND_SOUND_BUFFER, ...data);
            },
          });
          await newClient.start();

          window.electron.send(
            IPCSenderKeys.START_TRANSCRIBE,
            startTimestamp,
            {}
          );

          console.log("start Recording", startTimestamp, settingsData);
          useVBStore.setState({
            startTimestamp: startTimestamp,
            recording: true,
          });
          set({
            client: newClient,
            stream: unmixedOwnMicStream,
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

      // stopAudio on main process
      window.electron.send(IPCSenderKeys.END_TRANSCRIBE);

      // reset
      // interim が設定されている場合には、最後の interim を message に変換する
      const interimSegment = useVBStore.getState().interimSegment;

      useVBStore.setState({ recording: false, interimSegment: null });
      set({
        client: null,
        stream: null,
      });

      if (interimSegment) {
        setAppendedMinutesLines([interimSegment], true);
      }
    },

    splitTranscribe: () => {
      if (useVBStore.getState().isNoMinutes()) return;
      // recording
      if (useVBStore.getState().recording) {
        get().stopTranscribe();
        get().startTranscribe();
      }
    },
  }))
);

function setAppendedMinutesLines(
  segments: Segment[],
  isStopped: boolean = false
) {
  const newMinutes = splitMinutes(appendMinutesList(segments, 5));
  processDiscussionAction({
    type: "setMinutesLines",
    payload: {
      minutes: newMinutes.appendedMinutes,
      isStopped: isStopped,
    },
  });
}

function splitMinutes(appendedMinutes: DiscussionSegment[]): {
  appendedMinutes: DiscussionSegment[];
  hasNewStartPoint: boolean;
} {
  const minutesStore = useMinutesStore(
    useVBStore.getState().startTimestamp
  ).getState();
  const existedMinutes = minutesStore.discussion;
  const duration: number = minutesStore.discussionSplitter.duration;

  let hasNewStartPoint = false;
  if (duration === 0) return { appendedMinutes, hasNewStartPoint };
  // メインケース
  let lastStartTimestamp = 0;
  const newMinutes = [...existedMinutes, ...appendedMinutes].map((v, index) => {
    if (index === 0) {
      // 強制的に最初のトピックは開始点にする
      // この場合は新しく開始点が設定されたとはみなさない
      lastStartTimestamp = Number(v.timestamp);
      return { ...v, topicStartedPoint: true };
    } else if (v.topicStartedPoint) {
      // 設定済みの開始点はそのまま
      lastStartTimestamp = Number(v.timestamp);
      return v;
    } else if (Number(v.timestamp) - lastStartTimestamp > duration) {
      // 設定された時間を超えたら開始点にする
      lastStartTimestamp = Number(v.timestamp);
      hasNewStartPoint = true; // 新しく開始点が設定された
      return { ...v, topicStartedPoint: true };
    } else {
      return { ...v, topicStartedPoint: false };
    }
  });
  const newAppendedMinutes = newMinutes.slice(existedMinutes.length);
  //console.log("splitMinutes", duration, newAppendedMinutes);
  return {
    appendedMinutes: newAppendedMinutes,
    hasNewStartPoint,
  };
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
    setAppendedMinutesLines(segments);
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
    processVBAction({
      type: "updateInterimSegment",
      payload: {
        segment: response.segments[0],
      },
    });
  }
);
