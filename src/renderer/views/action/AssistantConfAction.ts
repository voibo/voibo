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
import {
  useMinutesAssistantStore,
  VirtualAssistantConf,
} from "../store/useAssistantsStore.jsx";
import { useMinutesStore } from "../store/useMinutesStore.jsx";
import { useVBStore } from "../store/useVBStore.jsx";
import { ActionBase } from "./ActionBase.js";

export type AssistantConfAction =
  | ActionBase<"addVirtualAssistantConf", { assistant: VirtualAssistantConf }>
  | ActionBase<"setVirtualAssistantConf", { assistant: VirtualAssistantConf }>
  | ActionBase<"removeVirtualAssistantConf", { assistantId: string }>;

export const processAssistantConfAction = async (
  action: AssistantConfAction
) => {
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
    default:
      console.warn("processAssistantConfAction: unexpected default", action);
  }
};
