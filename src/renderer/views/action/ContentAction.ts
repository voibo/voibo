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
import { Content } from "../../../common/content/content.js";
import { createTextContent } from "../flowComponent/node/content/TextContent.jsx";
import { ScreenCapture } from "../../../common/content/screencapture.js";
import { createCapturedImageContent } from "../flowComponent/node/content/CapturedImageContent.jsx";
import {
  getLayoutParam,
  useVBReactflowStore,
} from "../store/flow/useVBReactflowStore.jsx";

export type ContentAction =
  | ActionBase<"removeContent", { contentId: string }>
  | ActionBase<
      "addTextContent",
      { position?: { x: number; y: number }; content?: string; width?: number }
    >
  | ActionBase<
      "addCapturedImageContent",
      {
        frame: ScreenCapture;
        topicId?: string;
        position?: { x: number; y: number };
        width?: number;
      }
    >;

const DEFAULT_WIDTH = 200;
const DEFAULT_POSITION = { x: 0, y: 0 };

export const processContentAction = async (action: ContentAction) => {
  if (!useVBStore.getState().allReady || useVBStore.getState().isNoMinutes())
    return;
  const startTimestamp = useVBStore.getState().startTimestamp;

  let newContext: Content;
  switch (action.type) {
    case "removeContent":
      useMinutesContentStore(startTimestamp)
        .getState()
        .removeContent(action.payload.contentId);
      break;

    case "addTextContent":
      newContext = createTextContent({
        position: action.payload.position ?? DEFAULT_POSITION,
        content: action.payload.content ?? "",
        width: action.payload.width ?? DEFAULT_WIDTH,
      });
      useMinutesContentStore(startTimestamp).getState().setContent(newContext);
      break;
    case "addCapturedImageContent":
      const layout = getLayoutParam();
      let capturedImageContentPosition =
        action.payload.position ?? layout.capturedImage.offset;
      let capturedImageContentWidth =
        action.payload.width ?? layout.capturedImage.width;
      if (action.payload.topicId) {
        const topicNode = useVBReactflowStore
          .getState()
          .topicNodes.find((node) => node.id === action.payload.topicId);
        if (topicNode) {
          capturedImageContentPosition = {
            x:
              topicNode.position.x +
              (topicNode.width ?? DEFAULT_WIDTH) +
              layout.capturedImage.offset.x,
            y: topicNode.position.y,
          };
        }
        console.log("topicNode", topicNode, capturedImageContentWidth);
      }
      newContext = createCapturedImageContent({
        frame: action.payload.frame,
        position: capturedImageContentPosition,
        width: capturedImageContentWidth,
      });
      useMinutesContentStore(startTimestamp).getState().setContent(newContext);
      break;
    default:
      console.warn("processContentAction: unexpected default", action);
  }
};
