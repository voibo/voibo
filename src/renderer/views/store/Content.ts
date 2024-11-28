/*
Copyright 2024 SpiralMind Co., Ltd. & Humanest Ltd. & Spiral Effect

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
import { v4 as uuidv4 } from "uuid";

/**
 * Content
 *
 * ユーザーおよびアシスタントAIが作成したコンテンツを、統合的に扱うための型。
 * AI への input として利用できるため、コンテンツの種類には制限がある。
 */
export type ContentType =
  | "topic"
  | "agenda"
  | "text"
  | "json"
  | "image"
  | "message";

export interface Content {
  id: string;
  type: ContentType;
  connectedMessageIds: string[];
  agendaIds: string[];
  groupIds: string[]; // group 単位での visibility 切り替えに利用
  content: string;

  // node gui
  position: { x: number; y: number };
  width: number;
}

export function getDefaultContent(): Content {
  return {
    id: uuidv4(),
    type: "text",
    connectedMessageIds: [],
    agendaIds: [],
    groupIds: [],
    content: "",
    position: { x: 0, y: 0 },
    width: 0,
  };
}

export function isContent(obj: any): obj is Content {
  // Check if obj is not null and is an object
  if (typeof obj !== "object" || obj === null) {
    return false;
  }

  // Check if id is a string
  if (typeof obj.id !== "string") {
    return false;
  }

  // Check if type is a valid ContentType
  const validContentTypes: ContentType[] = [
    "topic",
    "agenda",
    "text",
    "json",
    "image",
    "message",
  ];
  if (!validContentTypes.includes(obj.type)) {
    return false;
  }

  // Check if position has x and y as numbers
  if (
    typeof obj.position !== "object" ||
    typeof obj.position.x !== "number" ||
    typeof obj.position.y !== "number"
  ) {
    return false;
  }

  // Check if width is a number
  if (typeof obj.width !== "number") {
    return false;
  }

  // All checks passed
  return true;
}
