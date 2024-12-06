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
import { MicVAD } from "@ricky0123/vad-web";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import {
  EnglishTopicPrompt,
  GENERAL_ASSISTANT_NAME,
  TopicSchema,
} from "../../../main/agent/agentManagerDefinition.js";
import { Segment } from "../../../common/Segment.js";
import { CaptureClient } from "../../lib/capture.js";
import { formatTimestamp } from "../../util.js";
import { AIConfig } from "../common/aiConfig.jsx";
import { Minutes } from "../db/DBConfig.jsx";
import {
  changeTopicStartedPoint,
  DiscussionSegment,
  mergeUpMinutesText,
  removeMinutesText,
  splitMinutesText,
  updateMinutesText,
} from "../discussion/DiscussionSegment.jsx";
import {
  DefaultSplitter,
  DiscussionSplitterConf,
} from "../topic/DiscussionSplitter.jsx";
import { Topic } from "../topic/Topic.js";
import { VirtualAssistantConf } from "./useAssistantsStore.jsx";
import { SystemDefaultTemplate } from "../assistant/AssistantTemplates.js";
import { v4 as uuidv4 } from "uuid";

// ==== VF Core ====

export type VFStateMode = "home" | "recordingStudio";
export type VFNeedToSaveMode =
  | undefined
  | "updateMinutesTitle"
  | "createNewMinutes"
  | "setMinutesLines"
  | "deleteMinutes"
  | "setTopic"
  | "updateMinutesText"
  | "removeMinutesText"
  | "splitMinutesText"
  | "mergeUpMinutesText"
  | "changeTopicStartedPoint"
  | "changeTopicAIConfig"
  | "removeTopic"
  | "deleteAllTopic"
  | "addVirtualAssistantConf"
  | "setVirtualAssistantConf"
  | "removeVirtualAssistantConf"
  | "updateTopic";

export type VFState = {
  // gui
  mode: VFStateMode;
  mainMenuOpen: boolean;
  startTimestamp: number | null;
  minutesTitle: string;
  recording: boolean;
  discussion: DiscussionSegment[];
  needToScrollMinutes: boolean;
  playWavMute: boolean;
  discussionSplitter: DiscussionSplitterConf;

  // db
  needToSaveOnDB: VFNeedToSaveMode;

  // config
  audioFolder: string;

  // == audio ==
  audioSettingsDialogOpen: boolean;

  // == Topic ==
  topics: Topic[];
  interimSegment: Segment | null;
  topicAIConf: AIConfig;

  // == Virtual Assistant ==
  assistants: VirtualAssistantConf[];

  // == zustand subscript ==
  lastAction: VFAction | null;
};

export const GeneralAssistantConf: VirtualAssistantConf = {
  assistantType: "va-general",
  aiConfig: {
    systemPrompt: "",
    modelType: "gemini-1.5-flash",
    temperature: 1,
  },
  assistantId: GENERAL_ASSISTANT_NAME,
  assistantName: GENERAL_ASSISTANT_NAME,
  icon: "./asset/dog_robo_iconL.svg",
  label: "General Assistant",
  updateMode: "manual",
  messageViewMode: "history",
};

export const initVFState = (): VFState => {
  return {
    // VF Conf
    needToSaveOnDB: undefined,

    // gui
    mode: "home",
    mainMenuOpen: true,
    audioSettingsDialogOpen: false,
    startTimestamp: null,
    minutesTitle: "",
    recording: false,
    discussion: [],
    needToScrollMinutes: true,
    playWavMute: true,
    discussionSplitter: DefaultSplitter,

    // config
    audioFolder: "/",

    // llm
    topics: [],
    interimSegment: null,
    topicAIConf: {
      modelType: "gpt-4",
      systemPrompt: EnglishTopicPrompt,
      structuredOutputSchema: TopicSchema,
      temperature: 0,
    },

    // == Virtual Assistant ==
    assistants: [GeneralAssistantConf],

    // == zustand subscript ==
    lastAction: null,
  };
};

export type VFAction =
  //| VAConfAction
  | {
      type: "savedOnDB";
      payload: {
        db: string;
        key: string | undefined;
      };
    }
  | {
      type: "updateMinutesTitle";
      payload: {
        minutesTitle: string;
      };
    }
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
      payload: Minutes;
    }
  | {
      type: "reTranscribeAll";
      payload: {
        startTimestamp: number;
        client: CaptureClient | null;
        stream: MediaStream | null;
        vad: MicVAD | null;
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
      type: "selectTopic";
      payload: {
        topicID: string;
        selected: boolean;
      };
    }
  | {
      type: "deselectAllTopic";
    }
  | {
      type: "selectAllTopic";
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

const vfCoreReducerBase = (state: VFState, action: VFAction): VFState => {
  switch (action.type) {
    case "addVirtualAssistantConf":
      return {
        ...state,
        assistants: [...state.assistants, action.payload.assistant],
        needToSaveOnDB: "addVirtualAssistantConf" as VFNeedToSaveMode,
      };
    case "removeVirtualAssistantConf":
      return {
        ...state,
        assistants: state.assistants.filter(
          (item) => item.assistantId !== action.payload.assistantId
        ),
        needToSaveOnDB: "removeVirtualAssistantConf" as VFNeedToSaveMode,
      };
    case "setVirtualAssistantConf":
      console.log(
        "useVFStore: setVirtualAssistantConf",
        action.payload.assistant
      );
      return {
        ...state,
        assistants: state.assistants.map((assistantConfig) =>
          assistantConfig.assistantId == action.payload.assistant.assistantId
            ? { ...action.payload.assistant }
            : assistantConfig
        ),
        needToSaveOnDB: "setVirtualAssistantConf" as VFNeedToSaveMode,
      };
    case "selectAllTopic":
      return {
        ...state,
        topics: state.topics.map((item) => {
          return {
            ...item,
            selected: true,
          };
        }),
      };
    case "deselectAllTopic":
      return {
        ...state,
        topics: state.topics.map((item) => {
          return {
            ...item,
            selected: false,
          };
        }),
      };
    case "selectTopic":
      const topics: Topic[] = JSON.parse(JSON.stringify(state.topics));
      const targetIndex = topics.findIndex(
        (topic) => topic.id === action.payload.topicID
      );
      if (targetIndex !== -1) {
        topics[targetIndex].selected = action.payload.selected;
        return {
          ...state,
          topics: topics,
        };
      } else {
        return state;
      }
    case "removeTopic":
      return {
        ...state,
        topics: state.topics.filter(
          (topic) => topic.id !== action.payload.topicID
        ),
        needToSaveOnDB: "removeTopic" as VFNeedToSaveMode,
      };
    case "deleteAllTopic":
      return {
        ...state,
        topics: [],
        needToSaveOnDB: "deleteAllTopic" as VFNeedToSaveMode,
      };
    case "changeTopicStartedPoint":
      return {
        ...state,
        discussion: changeTopicStartedPoint(
          state.discussion,
          action.payload.segmentIndex
        ),
        needToSaveOnDB: "changeTopicStartedPoint" as VFNeedToSaveMode,
        needToScrollMinutes: false,
      };
    case "changeTopicAIConfig":
      return {
        ...state,
        topicAIConf: action.payload.aiConfig,
        needToSaveOnDB: "changeTopicAIConfig" as VFNeedToSaveMode,
      };
    case "updateMinutesText":
      return {
        ...state,
        discussion: updateMinutesText(
          state.discussion,
          action.payload.segmentIndex,
          action.payload.segmentTextIndex,
          action.payload.content
        ),
        needToSaveOnDB: "updateMinutesText" as VFNeedToSaveMode,
        needToScrollMinutes: false,
      };
    case "removeMinutesText":
      return {
        ...state,
        discussion: removeMinutesText(
          state.discussion,
          action.payload.segmentIndex,
          action.payload.segmentTextIndex
        ),
        needToSaveOnDB: "removeMinutesText" as VFNeedToSaveMode,
        needToScrollMinutes: false,
      };
    case "splitMinutesText":
      return {
        ...state,
        discussion: splitMinutesText(
          state.discussion,
          action.payload.segmentIndex,
          action.payload.segmentTextIndex
        ),
        needToSaveOnDB: "splitMinutesText" as VFNeedToSaveMode,
        needToScrollMinutes: false,
      };
    case "mergeUpMinutesText":
      return {
        ...state,
        discussion: mergeUpMinutesText(
          state.discussion,
          action.payload.segmentIndex,
          action.payload.segmentTextIndex
        ),
        needToSaveOnDB: "mergeUpMinutesText" as VFNeedToSaveMode,
        needToScrollMinutes: false,
      };
    case "setTopic":
      // 直前の内容をTopicから排除しきれなかった場合は、最新新しいトピックを無視する
      return {
        ...state,
        topics: [...state.topics, ...action.payload.topics],
        needToSaveOnDB: "setTopic" as VFNeedToSaveMode,
      };
    case "deleteMinutes":
      return {
        ...state,
        needToSaveOnDB: "deleteMinutes" as VFNeedToSaveMode,
        mode: "home" as VFStateMode,
        mainMenuOpen: true,
        minutesTitle: ``,
        startTimestamp: action.payload.startTimestamp,
        recording: false,
        discussion: [],
        topics: [],
        assistants: [],
      };
    case "savedOnDB":
      //console.log("savedOnDB", action.payload);
      return {
        ...state,
        needToSaveOnDB: undefined,
      };
    case "updateMinutesTitle":
      return {
        ...state,
        minutesTitle: action.payload.minutesTitle,
        needToSaveOnDB: "updateMinutesTitle" as VFNeedToSaveMode,
      };
    case "createNewMinutes":
      const startTimestamp = Date.now();
      return {
        ...state,
        mode: "recordingStudio" as VFStateMode,
        startTimestamp: startTimestamp,
        minutesTitle: `会議: ${formatTimestamp(startTimestamp)}`,
        recording: false,
        discussion: [],
        mainMenuOpen: false,
        needToSaveOnDB: "createNewMinutes" as VFNeedToSaveMode,
        needToScrollMinutes: true,
        assistants: SystemDefaultTemplate.map((template) => {
          return {
            ...template.config,
            assistantId: uuidv4(),
          };
        }),
      };
    case "openHomeMenu":
      return {
        ...state,
        mode: "home" as VFStateMode,
        minutesTitle: ``,
        startTimestamp: null,
        recording: false,
        discussion: [],
        mainMenuOpen: true,
        topics: [],
        assistants: [],
        interimSegment: null,
      };
    case "changeVADDialogOpen":
      return {
        ...state,
        audioSettingsDialogOpen: !state.audioSettingsDialogOpen,
      };
    case "reTranscribeAll":
      return {
        ...state,
        startTimestamp: action.payload.startTimestamp,
        recording: true,
      };
    case "setAudioFolder":
      return {
        ...state,
        audioFolder: action.payload.audioFolder,
      };
    case "setMinutesLines":
      return {
        ...state,
        discussion: [...state.discussion, ...action.payload.minutes],
        needToSaveOnDB: "setMinutesLines" as VFNeedToSaveMode,
        needToScrollMinutes: true,
        // remove interimSegment
        interimSegment: null,
      };
    case "openMinutes":
      console.log("vfCoreReducerBase: openMinutes", action.payload);
      return {
        ...state,
        mode: "recordingStudio" as VFStateMode,
        recording: false,
        startTimestamp: action.payload.startTimestamp,
        minutesTitle: action.payload.title,
        discussion: action.payload.minutes,
        topics: action.payload.topics,
        mainMenuOpen: false,
        needToScrollMinutes: true,
        assistants: action.payload.assistants,
        interimSegment: null,
        topicAIConf: action.payload.topicAIConf,
      };
    case "togglePlayWavMute":
      return {
        ...state,
        playWavMute: !state.playWavMute,
      };
    case "updateInterimSegment":
      return {
        ...state,
        interimSegment: action.payload.segment,
      };
    case "changeDiscussionSplitterConf":
      const result = {
        ...state,
        discussionSplitter: { ...action.payload.splitterConf },
      };
      console.log("changeDiscussionSplitterConf", result);
      return result;
    case "updateTopic":
      return {
        ...state,
        topics: state.topics.map((topic) =>
          topic.id === action.payload.topic.id ? action.payload.topic : topic
        ),
        needToSaveOnDB: "updateTopic" as VFNeedToSaveMode,
      };
    default:
      console.log("vfReducer: unexpected default", action);
      return state;
  }
};

export const vfCoreReducer = (state: VFState, action: VFAction): VFState => {
  const result = vfCoreReducerBase(state, action);
  result.lastAction = action;
  return result;
};

export type VFDispatchStore = {
  vfDispatch: (action: VFAction) => void;
  mergeSequentialTopics: (topics: Topic[]) => void;
  updateTopic: (topic: Topic) => void;
};
// VFCoreStateストア
export const useVFStore = create<VFState & VFDispatchStore>()(
  subscribeWithSelector((set, get) => ({
    ...initVFState(),
    vfDispatch: (action) => set((state) => vfCoreReducer(state, action)),
    mergeSequentialTopics: (topics) => {
      const sequentialTopics = filterSequentialTopics(topics);
      if (sequentialTopics.length > 1) {
        const firstTopic = sequentialTopics[0].topic;
        const lastTopic = sequentialTopics[sequentialTopics.length - 1].topic;

        // 最初のTopicを更新（IDは再利用）、それ以外のTopicは削除する。
        // 合成されて削除されるTopicのIDを利用するConnectedIdをさがして、更新する。
        // 当該IDを利用するEdgeも更新し、表示を点線にする。

        const mergedTopic: Topic = {
          ...firstTopic,
          title: sequentialTopics
            .map((item) => item.topic.title)
            .join(" / ")
            .slice(0, 100),
        };
        set((state) => ({
          ...state,
          topics: state.topics
            .filter(
              (topic) =>
                !sequentialTopics.map((item) => item.topic).includes(topic)
            )
            .concat(mergedTopic),
        }));
      }
    },
    updateTopic: (topic) => {
      set({
        topics: get().topics.map((currentTopic) =>
          topic.id === currentTopic.id ? topic : currentTopic
        ),
      });
    },
  }))
);

export function filterSequentialTopics(
  topics: Topic[]
): Array<{ index: number; topic: Topic }> {
  const sequentialTopics: Array<{ index: number; topic: Topic }> = [];
  let checked = true;
  topics.forEach((topic) => {
    if (!checked) return;
    // index 確認
    const targetIndex = useVFStore.getState().topics.indexOf(topic);
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
