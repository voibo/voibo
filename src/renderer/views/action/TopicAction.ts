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
import { Topic } from "../../../common/content/topic.js";
import { useVBStore } from "../store/useVBStore.jsx";
import { useMinutesStore } from "../store/useMinutesStore.jsx";
import { useVBReactflowStore } from "../store/flow/useVBReactflowStore.jsx";
import { useMinutesAssistantStore } from "../store/useAssistantsStore.jsx";

export type TopicAction =
  | ActionBase<"setTopic", { topics: Topic[] }>
  | ActionBase<"updateTopic", { topic: Topic }>
  | ActionBase<"removeTopic", { topicID: string }>
  | ActionBase<"deleteAllTopic">;

export const processTopicAction = async (action: TopicAction) => {
  const startTimestamp = useVBStore.getState().startTimestamp;
  const minutesState = useMinutesStore(startTimestamp).getState();
  const assistantState = useMinutesAssistantStore(startTimestamp).getState();
  const vbReactflowState = useVBReactflowStore.getState();
  switch (action.type) {
    case "setTopic":
      minutesState.setTopic(action.payload.topics);
      minutesState.assistants.forEach((vaConfig) =>
        assistantState.enqueueTopicRelatedInvoke(vaConfig)
      );
      // After the node is added by setTopic, it is placed in the DOM, and then measured, and then the layout works.
      // Therefore, the layout cannot be executed here.
      vbReactflowState.setTopics(action.payload.topics);
      break;
    case "updateTopic":
      minutesState.updateTopic(action.payload.topic);
      vbReactflowState.updateTopic(action.payload.topic);
      break;
    case "removeTopic":
      minutesState.removeTopic(action.payload.topicID);
      // This relocation is needed to make new edge with considering removed topic.
      vbReactflowState.relocateTopics();
      break;
    case "deleteAllTopic":
      minutesState.deleteAllTopic();
      vbReactflowState.relocateTopics();
      break;
    default:
      console.warn("processTopicAction: unexpected default", action);
  }
};
