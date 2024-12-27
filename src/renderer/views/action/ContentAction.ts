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
import { useMinutesContentStore } from "../store/useContentStore.jsx";

export type ContentAction = ActionBase<"removeContent", { contentId: string }>;

export const processContentAction = async (action: ContentAction) => {
  if (!useVBStore.getState().allReady || useVBStore.getState().isNoMinutes())
    return;
  switch (action.type) {
    case "removeContent":
      useMinutesContentStore(useVBStore.getState().startTimestamp)
        .getState()
        .removeContent(action.payload.contentId);
      break;
    default:
      console.warn("processContentAction: unexpected default", action);
  }
};
