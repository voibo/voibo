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
import { v4 as uuidv4 } from "uuid";

/**
 * Content
 *
 * The type for content created by users and assistant AI.
 */
export type ContentType =
  | "topic"
  | "message"
  | "text"
  // reserved for future use
  | "agenda"
  | "json"
  | "image"
  | "capturedImage";

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
  height?: number;
}

export function getBaseContent(props?: Partial<Content>): Content {
  const content: Content = {
    id: uuidv4(),
    type: "text",
    connectedMessageIds: [],
    agendaIds: [],
    groupIds: [],
    content: "",
    position: { x: 0, y: 0 },
    width: 0,
  };

  // id, type以外のプロパティは、props で上書可能
  // type は各派生の中で型ガードに使うので、props で上書きしない
  if (props) {
    if (props.connectedMessageIds) {
      content.connectedMessageIds = props.connectedMessageIds;
    }
    if (props.agendaIds) {
      content.agendaIds = props.agendaIds;
    }
    if (props.groupIds) {
      content.groupIds = props.groupIds;
    }

    if (props.content) {
      content.content = props.content;
    }

    if (props.position) {
      content.position = props.position;
    }
    if (props.width) {
      content.width = props.width;
    }
  }
  return content;
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
    "message",
    "agenda",
    "text",
    "json",
    "image",
    "capturedImage",
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
