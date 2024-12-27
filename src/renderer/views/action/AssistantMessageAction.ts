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
import { ActionBase } from "./ActionBase.js";
import { useVBStore } from "../store/useVBStore.jsx";
import { useMinutesStore } from "../store/useMinutesStore.jsx";
import { useMinutesAssistantStore } from "../store/useAssistantsStore.jsx";
import { AssistantMessageNodeParam } from "../flowComponent/node/AssistantMessageNode.js";

export type AssistantMessageAction = ActionBase<
  "removeAssistantMessage",
  { data: AssistantMessageNodeParam }
>;

export const processAssistantMessageAction = async (
  action: AssistantMessageAction
) => {
  if (!useVBStore.getState().allReady || useVBStore.getState().isNoMinutes())
    return;
  const startTimestamp = useVBStore.getState().startTimestamp;
  switch (action.type) {
    case "removeAssistantMessage":
      const messageId = action.payload.data.id;
      const assistantConfig = useMinutesStore(startTimestamp)
        .getState()
        .assistants.find(
          (assistant) =>
            assistant.assistantId === action.payload.data.assistantId
        );
      if (assistantConfig) {
        console.log(
          "processAssistantMessageAction: removeAssistantMessage",
          messageId,
          assistantConfig
        );
        useMinutesAssistantStore(startTimestamp)
          .getState()
          .removeMessage(assistantConfig, { messageId });
      }
      break;
    default:
      console.warn("processAssistantMessageAction: unexpected default", action);
  }
};
