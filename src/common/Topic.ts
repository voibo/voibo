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

import { Content } from "./Content.js";

export type TopicSeed = {
  startTimestamp: number;
  endTimestamp: number;
  text: string;
  requireUpdate: boolean;
  agendaIdList?: string[];
};

export function isTopicSeed(obj: any): obj is TopicSeed {
  return (
    typeof obj === "object" &&
    typeof obj.startTimestamp === "number" &&
    typeof obj.endTimestamp === "number" &&
    typeof obj.text === "string" &&
    typeof obj.requireUpdate === "boolean" &&
    (typeof obj.agendaIdList === "undefined" || Array.isArray(obj.agendaIdList))
  );
}

export interface Topic extends Content {
  type: "topic";

  // core
  title: string;
  topic: string | string[];
  seedData?: TopicSeed;
  selected: boolean;

  classification?: string;
  category?: string;

  actions?: {
    action: string;
    responsible?: string;
    deadline?: string;
  }[];
}

export function isTopic(obj: any): obj is Topic {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }

  // First, check Content-specific properties
  if (
    typeof obj.id !== "string" ||
    obj.type !== "topic" || // Ensure it's specifically a "topic"
    typeof obj.position !== "object" ||
    typeof obj.position.x !== "number" ||
    typeof obj.position.y !== "number" ||
    typeof obj.width !== "number"
  ) {
    return false;
  }

  // Now, check Topic-specific properties
  if (
    typeof obj.title !== "string" ||
    (typeof obj.topic !== "string" && !Array.isArray(obj.topic)) ||
    typeof obj.selected !== "boolean"
  ) {
    return false;
  }

  // Check optional seedData property
  if (obj.seedData !== undefined && !isTopicSeed(obj.seedData)) {
    return false;
  }

  // Check optional actions array
  if (obj.actions !== undefined) {
    if (!Array.isArray(obj.actions)) {
      return false;
    }
    for (const action of obj.actions) {
      if (
        typeof action.action !== "string" ||
        (action.responsible !== undefined &&
          typeof action.responsible !== "string") ||
        (action.deadline !== undefined && typeof action.deadline !== "string")
      ) {
        return false;
      }
    }
  }

  // All checks passed, it's a Topic
  return true;
}
