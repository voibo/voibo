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
import { useVBReactflowStore } from "../store/useVBReactflowStore.jsx";
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
      // main
      window.electron.send(IPCSenderKeys.CREATE_MINUTES, startTimestamp);
      // renderer
      useVBStore.setState({ startTimestamp });
      useMinutesTitleStore.getState().setDefaultMinutesTitle(startTimestamp);
      useMinutesStore(startTimestamp).getState().createNewMinutes();
      useVBReactflowStore.getState().relocateTopics();
      renderStage();
      break;
    case "openMinutes":
      startTimestamp = action.payload.startTimestamp;
      // renderer
      useVBStore.setState({ startTimestamp });
      await Promise.all([
        useMinutesStore(startTimestamp).getState().waitForHydration(),
        useMinutesAssistantStore(startTimestamp).getState().waitForHydration(),
        useMinutesContentStore(startTimestamp).getState().waitForHydration(),
        useMinutesGroupStore(startTimestamp).getState().waitForHydration(),
      ]);

      useVBReactflowStore.getState().relocateTopics();
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

const openHomeMenu = async () => {
  useVBStore.setState({ startTimestamp: NO_MINUTES_START_TIMESTAMP });
  await useMinutesStore(NO_MINUTES_START_TIMESTAMP)
    .getState()
    .waitForHydration();

  const assistantsStore = useMinutesAssistantStore(
    NO_MINUTES_START_TIMESTAMP
  ).getState();
  if (assistantsStore.hasHydrated) {
    useMinutesStore(NO_MINUTES_START_TIMESTAMP)
      .getState()
      .assistants.forEach((vaConfig) =>
        assistantsStore.assistantDispatch(vaConfig)({
          type: "clearAll",
        })
      );
  }

  // reactflow
  useVBReactflowStore.getState().relocateTopics();
  renderHome();
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
