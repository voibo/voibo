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
import { processActionAssistantStoreOpenHome } from "../store/useAssistantsStore.jsx";
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
  const startTimestamp = useVBStore.getState().startTimestamp;
  const minutesState = useMinutesStore(startTimestamp).getState();
  switch (action.type) {
    case "createNewMinutes":
      const startTimestamp = Date.now();
      // main
      window.electron.send(IPCSenderKeys.CREATE_MINUTES, startTimestamp);
      // component
      useMinutesTitleStore.getState().setDefaultMinutesTitle(startTimestamp);
      useMinutesStore(startTimestamp).getState().createNewMinutes();
      // reactflow
      useVBReactflowStore.getState().relocateTopics();
      // render page
      useVBStore.setState({
        startTimestamp,
        recording: false,
        mainMenuOpen: false,
      });
      break;
    case "openMinutes":
      await useMinutesStore(action.payload.startTimestamp)
        .getState()
        .waitForHydration();
      // reactflow
      useVBReactflowStore.getState().relocateTopics();
      // render page
      useVBStore.setState({
        startTimestamp: action.payload.startTimestamp,
        mainMenuOpen: false,
        recording: false,
        interimSegment: null,
      });

      break;
    case "openHomeMenu":
      openHomeMenu();
      break;
    case "deleteMinutes":
      console.log("useVBStore: deleteMinutes: 0");
      // delete minutes
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
  await useMinutesStore(NO_MINUTES_START_TIMESTAMP)
    .getState()
    .waitForHydration();
  useVBStore.setState({
    startTimestamp: NO_MINUTES_START_TIMESTAMP,
    recording: false,
    mainMenuOpen: true,
    interimSegment: null,
  });
  processActionAssistantStoreOpenHome();

  // reactflow
  useVBReactflowStore.getState().relocateTopics();
};
