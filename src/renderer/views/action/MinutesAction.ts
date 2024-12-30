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
import { IPCSenderKeys } from "../../../common/constants.js";
import { useMinutesAgendaStore } from "../store/useAgendaStore.jsx";
import { useMinutesAssistantStore } from "../store/useAssistantsStore.jsx";
import { useMinutesContentStore } from "../store/useContentStore.jsx";
import { useMinutesGroupStore } from "../store/useGroupStore.jsx";
import { useMinutesStore } from "../store/useMinutesStore.jsx";
import { useMinutesTitleStore } from "../store/useMinutesTitleStore.jsx";
import {
  prepareAssistantNodeTo,
  prepareContentsNodeTo,
  useVBReactflowStore,
} from "../store/flow/useVBReactflowStore.jsx";
import {
  NO_MINUTES_START_TIMESTAMP,
  useVBStore,
} from "../store/useVBStore.jsx";
import { ActionBase } from "./ActionBase.js";
import { NavigateFunction } from "react-router-dom";

export type MinutesAction =
  | ActionBase<"createNewMinutes", { navigate: NavigateFunction }>
  | ActionBase<
      "deleteMinutes",
      { startTimestamp: number; navigate: NavigateFunction }
    >
  | ActionBase<
      "openMinutes",
      { startTimestamp: number; navigate: NavigateFunction }
    >
  | ActionBase<"openHomeMenu", { navigate: NavigateFunction }>;

export const processMinutesAction = async (action: MinutesAction) => {
  let startTimestamp = NO_MINUTES_START_TIMESTAMP;

  switch (action.type) {
    case "createNewMinutes":
      startTimestamp = Date.now();
      // title
      useMinutesTitleStore.getState().setDefaultMinutesTitle(startTimestamp);
      // main
      window.electron.send(IPCSenderKeys.CREATE_MINUTES, startTimestamp);
      // renderer
      useVBStore.setState({ startTimestamp });
      await renderStage(action.payload.navigate);
      useMinutesStore(startTimestamp).getState().createNewMinutes();
      await prepareStoresTo(startTimestamp);
      break;
    case "openMinutes":
      startTimestamp = action.payload.startTimestamp;
      await prepareStoresTo(startTimestamp);
      await renderStage(action.payload.navigate);
      break;
    case "openHomeMenu":
      await openHomeMenu(action.payload.navigate);
      break;
    case "deleteMinutes":
      // delete the minutes from all stores
      startTimestamp = action.payload.startTimestamp;
      useMinutesTitleStore
        .getState()
        .removeMinutesTitle(useVBStore.getState().startTimestamp);

      useMinutesStore(startTimestamp).getState().delete();
      useMinutesAgendaStore(startTimestamp).getState().delete();
      useMinutesAssistantStore(startTimestamp).getState().delete();
      useMinutesContentStore(startTimestamp).getState().delete();
      useMinutesGroupStore(startTimestamp).getState().delete();

      // open home
      await openHomeMenu(action.payload.navigate);
      break;
    default:
      console.warn("processTopicAction: unexpected default", action);
  }
};

const renderStage = async (navigate: NavigateFunction) => {
  useVBStore.setState({
    mainMenuOpen: false,
    recording: false,
    interimSegment: null,
  });
  await navigate("/main");
};

const renderHome = async (navigate: NavigateFunction) => {
  useVBStore.setState({
    recording: false,
    mainMenuOpen: true,
    interimSegment: null,
  });
  await navigate("/");
};

const openHomeMenu = async (navigate: NavigateFunction) => {
  await prepareStoresTo(NO_MINUTES_START_TIMESTAMP);
  // reactflow
  useVBReactflowStore.getState().relocateTopics();
  await renderHome(navigate);
};

/**
 * Switch stores to the specified minutes. Must be called with await.
 */
const prepareStoresTo = async (startTimestamp: number) => {
  // == Hydrate stores ==
  useVBStore.setState({ startTimestamp });
  await Promise.all([
    useMinutesStore(startTimestamp).getState().waitForHydration(),
    useMinutesAgendaStore(startTimestamp).getState().waitForHydration(),
    useMinutesAssistantStore(startTimestamp).getState().waitForHydration(),
    useMinutesContentStore(startTimestamp).getState().waitForHydration(),
    useMinutesGroupStore(startTimestamp).getState().waitForHydration(),
  ]);

  // == Subscribe stores ==
  subscribeTopicInvokeQueue(startTimestamp);
  subscribeAssistantInvokeQueue(startTimestamp);

  // == Subscribe to reactflow ==
  useVBReactflowStore.getState().relocateTopics();
  prepareContentsNodeTo(startTimestamp);
  prepareAssistantNodeTo(startTimestamp);
};

// Subscribe to Assistant stores
let unsubscribeAssistantInvokeQueue: (() => void) | null = null;
const subscribeAssistantInvokeQueue = (startTimestamp: number) => {
  const assistantsStore = useMinutesAssistantStore(startTimestamp);
  if (unsubscribeAssistantInvokeQueue) unsubscribeAssistantInvokeQueue();
  unsubscribeAssistantInvokeQueue = assistantsStore.subscribe(
    (assistantState) => assistantState.assistantsMap,
    (state) => {
      Array.from(state.values())
        .filter(
          (assistant) =>
            assistant.invokeQueue.length > 0 && !assistant.onProcess
        )
        .forEach(
          (assistant) =>
            assistantsStore.getState().processInvoke(assistant.vaConfig) // async function to process request => response
        );
    },
    {
      equalityFn: (prev, next) =>
        !Array.from(next.values()).some(
          (nextAssistant) => nextAssistant.invokeQueue.length > 0
        ),
    }
  );
};

let unsubscribeTopicInvokeQueue: (() => void) | null = null;
const subscribeTopicInvokeQueue = (startTimestamp: number) => {
  const topicStore = useMinutesStore(startTimestamp);
  if (unsubscribeTopicInvokeQueue) unsubscribeTopicInvokeQueue();
  unsubscribeTopicInvokeQueue = topicStore.subscribe(
    (state) => ({
      topicProcessing: state.topicProcessing,
      topicPrompts: state.topicPrompts,
      topicRes: state.topicRes,
    }),
    (state) => {
      topicStore.getState().processTopic();
    },
    {
      equalityFn: (prev, next) =>
        prev.topicProcessing === next.topicProcessing && // no change in processing
        prev.topicPrompts === next.topicPrompts &&
        prev.topicRes === next.topicRes, // ,
    }
  );
};
