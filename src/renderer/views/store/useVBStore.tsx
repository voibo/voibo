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
import { Segment } from "../../../common/Segment.js";
import { AIConfig } from "../common/aiConfig.js";
import { DiscussionSegment } from "../discussion/DiscussionSegment.js";
import { DiscussionSplitterConf } from "../topic/DiscussionSplitter.js";
import { Topic } from "../topic/Topic.js";
import { VirtualAssistantConf } from "./useAssistantsStore.js";
import {
  NO_MINUTES_START_TIMESTAMP,
  useMinutesStore,
} from "./useMinutesStore.jsx";
import { makeDefaultTitle, useMinutesTitleStore } from "./useMinutesTitle.jsx";
import { IPCSenderKeys } from "../../../common/constants.js";

// ==== VB Core ====

export type VBStateMode = "home" | "recordingStudio";

export type VBState = {
  // current minutes start timestamp.
  // if no minutes, it is NO_MINUTES_START_TIMESTAMP
  startTimestamp: number;

  // gui
  mode: VBStateMode;
  mainMenuOpen: boolean;
  recording: boolean;
  playWavMute: boolean;

  // config
  // == audio ==
  audioFolder: string;
  audioSettingsDialogOpen: boolean;
  // == Topic ==
  interimSegment: Segment | null;
  // == zustand subscript ==
  lastAction: VBAction | null;
};

type VBDispatch = {
  vbDispatch: (action: VBAction) => void;
  isNoMinutes: () => boolean;
};

export const useVBStore = create<VBState & VBDispatch>()(
  subscribeWithSelector((set, get) => ({
    // # State
    startTimestamp: NO_MINUTES_START_TIMESTAMP,

    // gui
    mode: "home",
    mainMenuOpen: true,
    recording: false,
    playWavMute: true,

    // config
    // == audio ==
    audioFolder: "/",
    audioSettingsDialogOpen: false,
    // == Topic ==
    interimSegment: null,
    // == zustand subscript ==
    lastAction: null,

    vbDispatch: (action) => VBActionProcessor(action),
    isNoMinutes: () => get().startTimestamp === NO_MINUTES_START_TIMESTAMP,
  }))
);

export type VBAction =
  | {
      type: "createNewMinutes";
    }
  | {
      type: "setMinutesLines";
      payload: {
        minutes: DiscussionSegment[];
      };
    }
  | {
      type: "setAudioFolder";
      payload: {
        audioFolder: string;
      };
    }
  | {
      type: "openMinutes";
      payload: {
        startTimestamp: number;
      };
    }
  | {
      type: "changeVADDialogOpen";
    }
  | {
      type: "openHomeMenu";
    }
  | {
      type: "deleteMinutes";
      payload: {
        startTimestamp: number;
      };
    }
  | {
      type: "setTopic";
      payload: {
        topics: Topic[];
      };
    }
  | {
      type: "removeTopic";
      payload: {
        topicID: string;
      };
    }
  | {
      type: "updateMinutesText";
      payload: {
        segmentIndex: number;
        segmentTextIndex: number;
        content: string;
      };
    }
  | {
      type: "removeMinutesText";
      payload: {
        segmentIndex: number;
        segmentTextIndex: number;
      };
    }
  | {
      type: "splitMinutesText";
      payload: {
        segmentIndex: number;
        segmentTextIndex: number;
      };
    }
  | {
      type: "mergeUpMinutesText";
      payload: {
        segmentIndex: number;
        segmentTextIndex: number;
      };
    }
  | {
      type: "changeTopicStartedPoint";
      payload: {
        segmentIndex: number;
      };
    }
  | {
      type: "changeTopicAIConfig";
      payload: {
        aiConfig: AIConfig;
      };
    }
  | {
      type: "togglePlayWavMute";
    }
  | {
      type: "deleteAllTopic";
    }
  | {
      type: "addVirtualAssistantConf";
      payload: {
        assistant: VirtualAssistantConf;
      };
    }
  | {
      type: "setVirtualAssistantConf";
      payload: {
        assistant: VirtualAssistantConf;
      };
    }
  | {
      type: "removeVirtualAssistantConf";
      payload: {
        assistantId: string;
      };
    }
  | {
      type: "updateInterimSegment";
      payload: {
        segment: Segment;
      };
    }
  | {
      type: "changeDiscussionSplitterConf";
      payload: {
        splitterConf: DiscussionSplitterConf;
      };
    }
  | {
      type: "updateTopic";
      payload: {
        topic: Topic;
      };
    };

export const VBActionProcessor = async (action: VBAction) => {
  const minutesState = useMinutesStore(
    useVBStore.getState().startTimestamp
  ).getState();
  switch (action.type) {
    case "addVirtualAssistantConf":
      minutesState.addVirtualAssistantConf(action.payload.assistant);
      break;
    case "removeVirtualAssistantConf":
      minutesState.removeVirtualAssistantConf(action.payload.assistantId);
      break;
    case "setVirtualAssistantConf":
      minutesState.setVirtualAssistantConf(action.payload.assistant);
      break;
    case "removeTopic":
      minutesState.removeTopic(action.payload.topicID);
      break;
    case "deleteAllTopic":
      minutesState.deleteAllTopic();
      break;
    case "changeTopicStartedPoint":
      minutesState.changeTopicStartedPoint(action.payload.segmentIndex);

      break;
    case "changeTopicAIConfig":
      minutesState.changeTopicAIConfig(action.payload.aiConfig);
      break;
    case "updateMinutesText":
      minutesState.updateMinutesText(
        action.payload.segmentIndex,
        action.payload.segmentTextIndex,
        action.payload.content
      );
      break;
    case "removeMinutesText":
      minutesState.removeMinutesText(
        action.payload.segmentIndex,
        action.payload.segmentTextIndex
      );
      break;
    case "splitMinutesText":
      minutesState.splitMinutesText(
        action.payload.segmentIndex,
        action.payload.segmentTextIndex
      );
      break;
    case "mergeUpMinutesText":
      minutesState.mergeUpMinutesText(
        action.payload.segmentIndex,
        action.payload.segmentTextIndex
      );
      break;
    case "setTopic":
      minutesState.setTopic(action.payload.topics);
      break;
    case "changeVADDialogOpen":
      useVBStore.setState({
        audioSettingsDialogOpen: !useVBStore().audioSettingsDialogOpen,
      });
      break;
    case "setAudioFolder":
      useVBStore.setState({
        audioFolder: action.payload.audioFolder,
      });
      break;
    case "setMinutesLines":
      minutesState.setMinutesLines(action.payload.minutes);
      useVBStore.setState({
        interimSegment: null,
      });
      break;
    case "togglePlayWavMute":
      useVBStore.setState({
        playWavMute: !useVBStore().playWavMute,
      });
      break;
    case "updateInterimSegment":
      useVBStore.setState({
        interimSegment: action.payload.segment,
      });
      break;
    case "changeDiscussionSplitterConf":
      minutesState.changeDiscussionSplitterConf(action.payload.splitterConf);
      break;
    case "updateTopic":
      minutesState.updateTopic(action.payload.topic);
      break;

    /** == MinutesDispatch関係 == */

    case "createNewMinutes":
      const startTimestamp = Date.now();
      console.warn("useVFStore: createNewMinutes: 0", startTimestamp);
      useMinutesStore(startTimestamp).getState().createNewMinutes();
      // server
      window.electron.send(IPCSenderKeys.CREATE_MINUTES, startTimestamp);
      // title
      useMinutesTitleStore.getState().setMinutesTitle({
        title: makeDefaultTitle(startTimestamp),
        startTimestamp: startTimestamp,
      });
      useVBStore.setState({
        startTimestamp,
        mode: "recordingStudio",
        recording: false,
        mainMenuOpen: false,
      });
      console.warn("useVFStore: createNewMinutes: 1", startTimestamp);
      break;
    case "openMinutes":
      console.warn("useVFStore: openMinutes: 0", action.payload.startTimestamp);
      await useMinutesStore(action.payload.startTimestamp)
        .getState()
        .waitForHydration()
        .then((newState) => {
          console.warn("useVFStore: openMinutes: 1", newState);
        });
      console.warn("useVFStore: openMinutes: 2", action.payload.startTimestamp);
      useVBStore.setState({
        startTimestamp: action.payload.startTimestamp,
        mode: "recordingStudio",
        mainMenuOpen: false,
        recording: false,
        interimSegment: null,
      });
      console.warn("useVFStore: openMinutes: 3", action.payload.startTimestamp);
      break;
    case "openHomeMenu":
      console.log("useVFStore: openHomeMenu: 0");
      await useMinutesStore(NO_MINUTES_START_TIMESTAMP)
        .getState()
        .waitForHydration()
        .then((newState) => {
          console.log("useVFStore: openHomeMenu: 1", newState);
        });
      console.log("useVFStore: openHomeMenu: 2");
      useVBStore.setState({
        startTimestamp: NO_MINUTES_START_TIMESTAMP,
        mode: "home",
        recording: false,
        mainMenuOpen: true,
        interimSegment: null,
      });
      console.log("useVFStore: openHomeMenu: 3");
      break;
    case "deleteMinutes":
      console.log("useVFStore: deleteMinutes: 0");
      minutesState.deleteMinutes();
      await useMinutesStore(NO_MINUTES_START_TIMESTAMP)
        .getState()
        .waitForHydration()
        .then((newState) => {
          console.log("useVFStore: deleteMinutes: 1", newState);
        });
      console.log("useVFStore: deleteMinutes: 2");
      useVBStore.setState({
        startTimestamp: NO_MINUTES_START_TIMESTAMP,
        mode: "home",
        mainMenuOpen: true,
        recording: false,
      });
      console.log("useVFStore: deleteMinutes: 3");
      break;
    default:
      console.log("vfActionProcessor: unexpected default", action);
  }
  useVBStore.setState({
    lastAction: action,
  });
};

export function filterSequentialTopics(
  topics: Topic[]
): Array<{ index: number; topic: Topic }> {
  const sequentialTopics: Array<{ index: number; topic: Topic }> = [];
  let checked = true;
  topics.forEach((topic) => {
    if (!checked) return;
    // index 確認
    const targetIndex = useMinutesStore(useVBStore.getState().startTimestamp)
      .getState()
      .topics.indexOf(topic);
    if (targetIndex === -1) {
      checked = false;
      return;
    }
    if (
      sequentialTopics.length === 0 ||
      sequentialTopics[sequentialTopics.length - 1].index + 1 === targetIndex
    ) {
      sequentialTopics.push({ topic, index: targetIndex });
    }
  });
  return sequentialTopics;
}
