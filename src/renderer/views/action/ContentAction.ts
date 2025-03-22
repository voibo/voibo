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
import {
  CapturedImageContentParam,
  createCapturedImageContent,
} from "../flowComponent/node/content/CapturedImageContent.jsx";
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
        frames: ScreenCapture[];
        topicId?: string;
        position?: { x: number; y: number };
        width?: number;
      }
    >;

export const processContentAction = async (action: ContentAction) => {
  if (!useVBStore.getState().allReady || useVBStore.getState().isNoMinutes())
    return;
  const startTimestamp = useVBStore.getState().startTimestamp;

  const layout = getLayoutParam();

  let newContext: Content;
  switch (action.type) {
    case "removeContent":
      useMinutesContentStore(startTimestamp)
        .getState()
        .removeContent(action.payload.contentId);
      break;

    case "addTextContent":
      newContext = createTextContent({
        position: action.payload.position ?? layout.content.offset,
        content: action.payload.content ?? "",
        width: action.payload.width ?? layout.content.width,
      });
      useMinutesContentStore(startTimestamp).getState().setContent(newContext);
      break;

    case "addCapturedImageContent":
      const configBase: Partial<CapturedImageContentParam> = {
        position: action.payload.position ?? layout.content.offset,
        width: action.payload.width ?? layout.content.width,
      };
      if (action.payload.topicId) {
        const topicNode = useVBReactflowStore
          .getState()
          .topicNodes.find((node) => node.id === action.payload.topicId);
        if (topicNode) {
          configBase.position = {
            x:
              topicNode.position.x +
              (topicNode.width ?? layout.content.width) +
              layout.content.offset.x,
            y: topicNode.position.y,
          };
          configBase.connectedMessageIds = [topicNode.id];
        }
        console.log("topicNode", topicNode, configBase);
      }
      action.payload.frames.forEach((frame, index) => {
        const config = { ...configBase, frame: frame };
        config.position = {
          x:
            config.position!.x +
            index * (layout.content.width + layout.content.offset.x),
          y: config.position!.y + index * layout.content.offset.y,
        };
        newContext = createCapturedImageContent(config);
        useMinutesContentStore(startTimestamp)
          .getState()
          .setContent(newContext);
      });
      break;
    default:
      console.warn("processContentAction: unexpected default", action);
  }
};
