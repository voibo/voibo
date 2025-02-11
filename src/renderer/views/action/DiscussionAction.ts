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
import { DiscussionSegment } from "../../../common/discussion.js";
import { useMinutesStore } from "../store/useMinutesStore.jsx";
import { useVBStore } from "../store/useVBStore.jsx";
import { ActionBase } from "./ActionBase.js";

export type DiscussionAction =
  | ActionBase<
      "setMinutesLines",
      { minutes: DiscussionSegment[]; isStopped: boolean }
    >
  | ActionBase<"changeTopicStartedPoint", { segmentIndex: number }>
  | ActionBase<
      "updateMinutesText",
      { segmentIndex: number; segmentTextIndex: number; content: string }
    >
  | ActionBase<
      "removeMinutesText",
      { segmentIndex: number; segmentTextIndex: number }
    >
  | ActionBase<
      "splitMinutesText",
      { segmentIndex: number; segmentTextIndex: number }
    >
  | ActionBase<
      "mergeUpMinutesText",
      { segmentIndex: number; segmentTextIndex: number }
    >;

export const processDiscussionAction = async (action: DiscussionAction) => {
  const startTimestamp = useVBStore.getState().startTimestamp;
  const minutesState = useMinutesStore(startTimestamp).getState();
  switch (action.type) {
    case "changeTopicStartedPoint":
      minutesState.changeTopicStartedPoint(action.payload.segmentIndex);
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
    case "setMinutesLines":
      minutesState.setMinutesLines(
        action.payload.minutes,
        action.payload.isStopped
      );
      useVBStore.setState({
        interimSegment: null,
      });
      break;
    default:
      console.warn("processDiscussionAction: unexpected default", action);
  }
};
