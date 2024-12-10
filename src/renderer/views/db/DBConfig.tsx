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
import { AIConfig } from "../common/aiConfig.jsx";
import { DiscussionSegment } from "../discussion/DiscussionSegment.jsx";
import { VirtualAssistantConf } from "../store/useAssistantsStore.jsx";
import { Topic } from "../topic/Topic.js";

// table name
export const DB_MINUTES = "minutes";

export const DBConfig = {
  name: "VF_DB",
  version: 9,
  objectStoresMeta: [
    {
      store: DB_MINUTES,
      storeConfig: { keyPath: "id", autoIncrement: false },
      storeSchema: [
        {
          name: "id",
          keypath: "id",
          options: { unique: true },
        },
        { name: "json", keypath: "id", options: { unique: false } },
      ],
    },
  ],
};

// ============== Common ==============
type CommonDBItem<T = string | number> = {
  id: T;
  json: string;
};

export type MinutesRecord = CommonDBItem<number>;
export type Minutes = {
  title: string;
  startTimestamp: number;
  minutes: DiscussionSegment[];
  topics: Topic[];
  assistants: VirtualAssistantConf[];
  topicAIConf: AIConfig;
};
