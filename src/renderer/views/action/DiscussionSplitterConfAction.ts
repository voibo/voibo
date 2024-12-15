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
import { useMinutesStore } from "../store/useMinutesStore.jsx";
import { useVBStore } from "../store/useVBStore.jsx";
import { DiscussionSplitterConf } from "../component/topic/DiscussionSplitter.js";
import { ActionBase } from "./ActionBase.js";

export type DiscussionSplitterConfAction = ActionBase<
  "changeDiscussionSplitterConf",
  { splitterConf: DiscussionSplitterConf }
>;

export const processDiscussionSplitterConfAction = async (
  action: DiscussionSplitterConfAction
) => {
  const startTimestamp = useVBStore.getState().startTimestamp;
  const minutesState = useMinutesStore(startTimestamp).getState();
  switch (action.type) {
    case "changeDiscussionSplitterConf":
      minutesState.changeDiscussionSplitterConf(action.payload.splitterConf);
      break;
    default:
      console.warn("vbActionProcessor: unexpected default", action);
  }
};
