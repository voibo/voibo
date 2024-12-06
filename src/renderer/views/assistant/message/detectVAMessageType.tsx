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
import { Message } from "../../../../main/agent/agentManagerDefinition.js";
import { TypicalRequestType } from "../input/VirtualAssistantRequester.jsx";

export function detectVAMessageType(message: Message): VAMessageResponse {
  let res: VAMessageResponse = { type: "Unknown", value: message };

  if (message.customField) {
    if (
      message.customField[`attachment`] === "topic" ||
      message.customField[`attachment`] === "discussion"
    ) {
      res = { type: "InvokedMessageWithAttachment", value: message };
    } else {
      res = { type: "InvokedMessage", value: message };
    }
  } else if (message.speaker == "ai") {
    const customField: Record<string, string> | undefined = undefined;
    if (customField && customField[`type`]) {
      const messageType = customField[`type`] as TypicalRequestType;
      switch (messageType) {
        case "MindMap":
          res = { type: "LangChainAIMessageMindMap", value: message };
          break;
        default:
          res = { type: "LangChainAIMessage", value: message };
          break;
      }
    } else {
      res = { type: "LangChainAIMessage", value: message };
    }
  } else if (message.speaker == "human") {
    const customField: Record<string, string> | undefined = undefined;
    if (customField && customField[`type`]) {
      const messageType = customField[`type`] as TypicalRequestType;
      switch (messageType) {
        case "MindMap":
          res = { type: "LangChainHumanMessageWithAttachment", value: message };
          break;
        default:
          res = { type: "LangChainHumanMessageWithAttachment", value: message };
          break;
      }
    } else {
      res = { type: "LangChainHumanMessage", value: message };
    }
  }

  //console.log("detectVAMessageType", message, res);
  return res;
}
export type VAMessageResponse =
  | {
    type: "InvokedMessage";
    value: Message;
  }
  | {
    type: "InvokedMessageWithAttachment";
    value: Message;
  }
  | {
    type: "LangChainAIMessage";
    value: Message;
  }
  | {
    type: "LangChainHumanMessage";
    value: Message;
  }
  | {
    type: "LangChainAIMessageWithAttachment";
    value: Message;
  }
  | {
    type: "LangChainHumanMessageWithAttachment";
    value: Message;
  }
  | {
    type: "LangChainAIMessageMindMap";
    value: Message;
  }
  | {
    type: "Unknown";
    value: Message;
  };
