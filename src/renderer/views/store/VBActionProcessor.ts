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
import { Segment } from "../../../common/Segment.js";
import { AIConfig } from "../common/aiConfig.js";
import { DiscussionSegment } from "../discussion/DiscussionSegment.js";
import { DiscussionSplitterConf } from "../topic/DiscussionSplitter.js";
import { Topic } from "../topic/Topic.js";
import {
  useMinutesAssistantStore,
  VirtualAssistantConf,
} from "./useAssistantsStore.jsx";
import { useMinutesStore } from "./useMinutesStore.jsx";
import {
  makeDefaultTitle,
  useMinutesTitleStore,
} from "./useMinutesTitleStore.jsx";
import { IPCSenderKeys } from "../../../common/constants.js";
import { useTopicStore } from "./useTopicManagerStore.jsx";
import { NO_MINUTES_START_TIMESTAMP, useVBStore } from "./useVBStore.jsx";
import { useVBReactflowStore } from "./useVBReactflowStore.jsx";

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

export const processVBAction = async (action: VBAction) => {
  const startTimestamp = useVBStore.getState().startTimestamp;
  const minutesState = useMinutesStore(startTimestamp).getState();
  const assistantsStore = useMinutesAssistantStore(startTimestamp).getState();
  switch (action.type) {
    case "addVirtualAssistantConf":
      minutesState.addVirtualAssistantConf(action.payload.assistant);
      assistantsStore.getOrInitAssistant(action.payload.assistant);
      assistantsStore.enqueueTopicRelatedInvoke(action.payload.assistant);
      break;
    case "setVirtualAssistantConf":
      minutesState.setVirtualAssistantConf(action.payload.assistant);
      assistantsStore.enqueueTopicRelatedInvoke(action.payload.assistant);
      break;
    case "removeVirtualAssistantConf":
      minutesState.removeVirtualAssistantConf(action.payload.assistantId);
      assistantsStore.removeAssistant(action.payload.assistantId);
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

    // == Topic ==
    case "setTopic":
      minutesState.setTopic(action.payload.topics);

      // reactflow
      useVBReactflowStore.getState().setTopics(action.payload.topics);
      break;
    case "updateTopic":
      minutesState.updateTopic(action.payload.topic);

      // reactflow
      useVBReactflowStore.getState().updateTopic(action.payload.topic);
      break;
    case "removeTopic":
      minutesState.removeTopic(action.payload.topicID);

      // reactflow
      useVBReactflowStore.getState().relocateTopics();
      break;
    case "deleteAllTopic":
      minutesState.deleteAllTopic();

      // reactflow
      useVBReactflowStore.getState().relocateTopics();
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
      useTopicStore.getState().updateTopicSeeds(false);
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

    /** == MinutesDispatch関係 == */

    case "createNewMinutes":
      const startTimestamp = Date.now();
      console.warn("useVBStore: createNewMinutes: 0", startTimestamp);
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

      // reactflow
      useVBReactflowStore.getState().relocateTopics();
      console.warn("useVBStore: createNewMinutes: 1", startTimestamp);
      break;
    case "openMinutes":
      console.warn("useVBStore: openMinutes: 0", action.payload.startTimestamp);
      await useMinutesStore(action.payload.startTimestamp)
        .getState()
        .waitForHydration();
      console.warn("useVBStore: openMinutes: 1", action.payload.startTimestamp);
      useVBStore.setState({
        startTimestamp: action.payload.startTimestamp,
        mode: "recordingStudio",
        mainMenuOpen: false,
        recording: false,
        interimSegment: null,
      });

      // reactflow
      useVBReactflowStore.getState().relocateTopics();
      console.warn("useVBStore: openMinutes: 2", action.payload.startTimestamp);
      break;
    case "openHomeMenu":
      openHomeMenu();
      break;
    case "deleteMinutes":
      console.log("useVBStore: deleteMinutes: 0");
      minutesState.deleteMinutes();
      useMinutesTitleStore
        .getState()
        .removeMinutesTitle(useVBStore.getState().startTimestamp);
      console.log("useVBStore: deleteMinutes: 1");
      // open home
      openHomeMenu();
      break;
    default:
      console.log("vbActionProcessor: unexpected default", action);
  }
};

const openHomeMenu = async () => {
  await useMinutesStore(NO_MINUTES_START_TIMESTAMP)
    .getState()
    .waitForHydration();
  useVBStore.setState({
    startTimestamp: NO_MINUTES_START_TIMESTAMP,
    mode: "home",
    recording: false,
    mainMenuOpen: true,
    interimSegment: null,
  });

  // reactflow
  useVBReactflowStore.getState().relocateTopics();
};
