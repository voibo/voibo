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
} from "../store/useVBReactflowStore.jsx";
import {
  NO_MINUTES_START_TIMESTAMP,
  useVBStore,
} from "../store/useVBStore.jsx";
import { ActionBase } from "./ActionBase.js";

export type MinutesAction =
  | ActionBase<"createNewMinutes">
  | ActionBase<"deleteMinutes", { startTimestamp: number }>
  | ActionBase<"openMinutes", { startTimestamp: number }>
  | ActionBase<"openHomeMenu">;

export const processMinutesAction = async (action: MinutesAction) => {
  let startTimestamp = NO_MINUTES_START_TIMESTAMP;

  switch (action.type) {
    case "createNewMinutes":
      startTimestamp = Date.now();
      // title
      useMinutesTitleStore.getState().setDefaultMinutesTitle(startTimestamp);
      startTimestamp = Date.now();
      // title
      useMinutesTitleStore.getState().setDefaultMinutesTitle(startTimestamp);
      // main
      window.electron.send(IPCSenderKeys.CREATE_MINUTES, startTimestamp);

      // renderer
      useVBStore.setState({ startTimestamp });
      useMinutesStore(startTimestamp).getState().createNewMinutes();

      await prepareStoresTo(startTimestamp);
      renderStage();
      break;
    case "openMinutes":
      startTimestamp = action.payload.startTimestamp;

      await prepareStoresTo(startTimestamp);
      renderStage();
      break;
    case "openHomeMenu":
      openHomeMenu();
      break;
    case "deleteMinutes":
      console.log("useVBStore: deleteMinutes: 0");
      // delete minutes
      const minutesState = useMinutesStore(startTimestamp).getState();
      minutesState.deleteMinutes();
      useMinutesTitleStore
        .getState()
        .removeMinutesTitle(useVBStore.getState().startTimestamp);

      // open home
      openHomeMenu();
      break;
    default:
      console.warn("processTopicAction: unexpected default", action);
  }
};

const switchStoresCurrentMinutes = async (startTimestamp: number) => {
  // renderer
  useVBStore.setState({ startTimestamp });
  await Promise.all([
    useMinutesStore(startTimestamp).getState().waitForHydration(),
    useMinutesAgendaStore(startTimestamp).getState().waitForHydration(),
    useMinutesAssistantStore(startTimestamp).getState().waitForHydration(),
    useMinutesContentStore(startTimestamp).getState().waitForHydration(),
    useMinutesGroupStore(startTimestamp).getState().waitForHydration(),
  ]);
};

const renderStage = () => {
  useVBStore.setState({
    mainMenuOpen: false,
    recording: false,
    interimSegment: null,
  });
};

const renderHome = () => {
  useVBStore.setState({
    recording: false,
    mainMenuOpen: true,
    interimSegment: null,
  });
};

const openHomeMenu = async () => {
  await prepareStoresTo(NO_MINUTES_START_TIMESTAMP);
  // reactflow
  useVBReactflowStore.getState().relocateTopics();
  renderHome();
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
  prepareAssistantWithHydratedStores(startTimestamp);

  // == Subscribe to reactflow ==
  useVBReactflowStore.getState().relocateTopics();
  prepareContentsNodeTo(startTimestamp);
  prepareAssistantNodeTo(startTimestamp);
};

// Subscribe to Assistant stores
let unsubscribeAssistantProcessInvoke: (() => void) | null = null;
let unsubscribeTopicChange: (() => void) | null = null;
const prepareAssistantWithHydratedStores = (startTimestamp: number) => {
  const assistantsStore = useMinutesAssistantStore(startTimestamp);

  // In case of invokeQueue is remained, start processing
  if (unsubscribeAssistantProcessInvoke) {
    unsubscribeAssistantProcessInvoke();
  }
  unsubscribeAssistantProcessInvoke = assistantsStore.subscribe(
    (assistantState) => assistantState.assistantsMap,
    (state) => {
      Array.from(state.values())
        .filter(
          (assistant) =>
            assistant.invokeQueue.length > 0 && !assistant.onProcess
        )
        .forEach(
          (assistant) =>
            assistantsStore.getState().processInvoke(assistant.vaConfig) // 同期関数でrequest => response まで処理)
        );
    },
    {
      equalityFn: (prev, next) =>
        !Array.from(next.values()).some(
          (nextAssistant) => nextAssistant.invokeQueue.length > 0
        ),
    }
  );

  // Enqueue invoke of Assistant triggered by Topic change
  if (unsubscribeTopicChange) {
    unsubscribeTopicChange();
  }
  unsubscribeTopicChange = useMinutesStore(startTimestamp).subscribe(
    (state) => ({ topics: state.topics, assistants: state.assistants }),
    (state) => {
      useMinutesStore(startTimestamp)
        .getState()
        .assistants.forEach((vaConfig) => {
          useMinutesAssistantStore(startTimestamp)
            .getState()
            .enqueueTopicRelatedInvoke(vaConfig);
        });
    },
    {
      equalityFn: (prev, next) =>
        !(
          prev !== next ||
          prev.topics.length !== next.topics.length ||
          prev.assistants.length !== next.assistants.length
        ),
    }
  );
};
