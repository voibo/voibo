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
import {
  EnglishTopicPrompt,
  TopicSchema,
} from "../../../common/agentManagerDefinition.js";
import {
  AssistantTemplates,
  SystemDefaultTemplate,
} from "../assistant/AssistantTemplates.js";
import { AIConfig } from "../common/aiConfig.jsx";
import {
  changeTopicStartedPoint,
  DiscussionSegment,
  mergeUpMinutesText,
  removeMinutesText,
  splitMinutesText,
  updateMinutesText,
} from "../discussion/DiscussionSegment.jsx";
import {
  DefaultSplitter,
  DiscussionSplitterConf,
} from "../topic/DiscussionSplitter.jsx";
import { Topic } from "../topic/Topic.jsx";
import { VirtualAssistantConf } from "./useAssistantsStore.jsx";
import { v4 as uuidv4 } from "uuid";

import { createStore, del, get, set } from "idb-keyval";
import {
  createJSONStorage,
  persist,
  StateStorage,
  subscribeWithSelector,
} from "zustand/middleware";
import { ExpandJSONOptions, HydrateState } from "./IDBKeyValPersistStorage.jsx";
import { create } from "zustand";
import { enableMapSet } from "immer";
enableMapSet();

// === IDBKeyVal ===
//  Custom storage object
const minutesIDBStore = createStore("voibo", "minutes");
const MinutesPersistStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    //console.log("MinutesPersistStorage.getItem", name);
    return (await get(name, minutesIDBStore)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    //console.log("MinutesPersistStorage.setItem:", name, value);
    await set(name, value, minutesIDBStore);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name, minutesIDBStore);
  },
};

// MinutesState
export const NO_MINUTES_START_TIMESTAMP = 0;

export type MinutesStore = {
  startTimestamp: number;
  discussionSplitter: DiscussionSplitterConf;
  discussion: DiscussionSegment[];
  topicAIConf: AIConfig;
  topics: Topic[];
  assistants: VirtualAssistantConf[];
};

export const DefaultMinutesStore: MinutesStore = {
  startTimestamp: NO_MINUTES_START_TIMESTAMP,
  discussionSplitter: DefaultSplitter,
  discussion: [],
  topicAIConf: {
    modelType: "gpt-4",
    systemPrompt: EnglishTopicPrompt,
    structuredOutputSchema: TopicSchema,
    temperature: 0,
  },
  topics: [],
  assistants: [],
};

export const initMinutesState = (startTimestamp: number): MinutesStore => {
  return {
    ...DefaultMinutesStore,
    startTimestamp: startTimestamp,
  };
};

const NoMinutesState = {
  ...initMinutesState(NO_MINUTES_START_TIMESTAMP),
};

export type MinutesDispatchStore =
  | AssistantConfDispatch
  | DiscussionSplitterConfDispatch
  | TopicAIConfDispatch
  | TopicDispatch
  | DiscussionDispatch
  | MinutesDispatch;

type AssistantConfDispatch = {
  addVirtualAssistantConf: (assistant: VirtualAssistantConf) => void;
  removeVirtualAssistantConf: (assistantId: string) => void;
  setVirtualAssistantConf: (assistant: VirtualAssistantConf) => void;
};

type DiscussionSplitterConfDispatch = {
  changeDiscussionSplitterConf: (splitterConf: DiscussionSplitterConf) => void;
};

type TopicAIConfDispatch = {
  changeTopicAIConfig: (aiConfig: AIConfig) => void;
};

type TopicDispatch = {
  removeTopic: (topicID: string) => void;
  deleteAllTopic: () => void;
  setTopic: (topics: Topic[]) => void;
  updateTopic: (topic: Topic) => void;
};

type DiscussionDispatch = {
  setMinutesLines: (minutes: DiscussionSegment[]) => void;
  changeTopicStartedPoint: (segmentIndex: number) => void;
  updateMinutesText: (
    segmentIndex: number,
    segmentTextIndex: number,
    content: string
  ) => void;
  removeMinutesText: (segmentIndex: number, segmentTextIndex: number) => void;
  splitMinutesText: (segmentIndex: number, segmentTextIndex: number) => void;
  mergeUpMinutesText: (segmentIndex: number, segmentTextIndex: number) => void;
};

type MinutesDispatch = {
  deleteMinutes: () => void;
  createNewMinutes: () => void;
  openHomeMenu: () => void;
  openMinutes: (startTimestamp: number) => void;
};

// Zustand Store

const storeCache = new Map<number, ReturnType<typeof useMinutesStoreCore>>();
export const useMinutesStore = (minutesStartTimestamp: number) => {
  let newStore;
  if (storeCache.has(minutesStartTimestamp)) {
    // 既にキャッシュに存在する場合はそれを利用
    newStore = storeCache.get(minutesStartTimestamp)!;
  } else {
    // ない場合は新たに作成してキャッシュに保存
    newStore = useMinutesStoreCore(minutesStartTimestamp);
    storeCache.set(minutesStartTimestamp, newStore);
  }
  return newStore;
};

type QueuedAction = () => void;
const useMinutesStoreCore = (minutesStartTimestamp: number) => {
  //console.log("useMinutesStoreCore", minutesStartTimestamp);
  // Hydration が完了するまでの操作を保存する Queue
  const actionQueue: QueuedAction[] = [];
  // Queue に操作を積むメソッド
  const enqueueAction = (action: QueuedAction) => {
    actionQueue.push(action);
  };
  // Hydration が完了したら Queue の操作を実行するメソッド
  const flushQueue = () => {
    while (actionQueue.length > 0) {
      const action = actionQueue.shift();
      if (action) {
        action(); // 同期的に実行
      }
    }
  };

  return create<MinutesStore & MinutesDispatchStore & HydrateState>()(
    persist(
      subscribeWithSelector((set, get) => ({
        // Hydration
        _hasHydrated: false,
        _setHasHydrated: (state) => {
          set({
            _hasHydrated: state,
          });
          if (state) {
            flushQueue();
          }
        },

        // State
        ...initMinutesState(NO_MINUTES_START_TIMESTAMP),

        // Dispatch
        // == AssistantConfDispatch ==
        addVirtualAssistantConf: (assistant) => {
          const action = () => {
            set((state) => ({ assistants: [...state.assistants, assistant] }));
          };
          if (!get()._hasHydrated) {
            enqueueAction(action);
          } else {
            action();
          }
        },
        removeVirtualAssistantConf: (assistantId) => {
          const action = () => {
            set((state) => ({
              assistants: state.assistants.filter(
                (item) => item.assistantId !== assistantId
              ),
            }));
          };
          if (!get()._hasHydrated) {
            enqueueAction(action);
          } else {
            action();
          }
        },
        setVirtualAssistantConf: (assistant) => {
          const action = () => {
            set((state) => ({
              assistants: state.assistants.map((assistantConfig) =>
                assistantConfig.assistantId == assistant.assistantId
                  ? { ...assistant }
                  : assistantConfig
              ),
            }));
          };
          if (!get()._hasHydrated) {
            enqueueAction(action);
          } else {
            action();
          }
        },

        // == DiscussionSplitter ==
        changeDiscussionSplitterConf: (splitterConf) => {
          const action = () => {
            set({ discussionSplitter: splitterConf });
          };
          if (!get()._hasHydrated) {
            enqueueAction(action);
          } else {
            action();
          }
        },

        // == TopicAIConfDispatch ==
        changeTopicAIConfig: (aiConfig) => {
          const action = () => {
            set({ topicAIConf: aiConfig });
          };
          if (!get()._hasHydrated) {
            enqueueAction(action);
          } else {
            action();
          }
        },

        // == TopicDispatch ==
        removeTopic: (topicID) => {
          const action = () => {
            set((state) => ({
              topics: state.topics.filter((topic) => topic.id !== topicID),
            }));
          };
          if (!get()._hasHydrated) {
            enqueueAction(action);
          } else {
            action();
          }
        },
        deleteAllTopic: () => {
          const action = () => {
            set({ topics: [] });
          };
          if (!get()._hasHydrated) {
            enqueueAction(action);
          } else {
            action();
          }
        },
        setTopic: (topics) => {
          const action = () => {
            set((state) => ({ topics: [...state.topics, ...topics] }));
          };
          if (!get()._hasHydrated) {
            enqueueAction(action);
          } else {
            action();
          }
        },
        updateTopic: (topic) => {
          const action = () => {
            set((state) => ({
              topics: state.topics.map((currentTopic) =>
                currentTopic.id === topic.id ? topic : currentTopic
              ),
            }));
          };
          if (!get()._hasHydrated) {
            enqueueAction(action);
          } else {
            action();
          }
        },

        // == DiscussionDispatch ==
        setMinutesLines: (minutes) => {
          const action = () => {
            set((state) => ({ discussion: [...state.discussion, ...minutes] }));
          };
          if (!get()._hasHydrated) {
            enqueueAction(action);
          } else {
            action();
          }
        },
        changeTopicStartedPoint: (segmentIndex) => {
          const action = () => {
            set((state) => ({
              discussion: changeTopicStartedPoint(
                state.discussion,
                segmentIndex
              ),
            }));
          };
          if (!get()._hasHydrated) {
            enqueueAction(action);
          } else {
            action();
          }
        },
        updateMinutesText: (segmentIndex, segmentTextIndex, content) => {
          const action = () => {
            set((state) => ({
              discussion: updateMinutesText(
                state.discussion,
                segmentIndex,
                segmentTextIndex,
                content
              ),
            }));
          };
          if (!get()._hasHydrated) {
            enqueueAction(action);
          } else {
            action();
          }
        },
        removeMinutesText: (segmentIndex, segmentTextIndex) => {
          const action = () => {
            set((state) => ({
              discussion: removeMinutesText(
                state.discussion,
                segmentIndex,
                segmentTextIndex
              ),
            }));
          };
          if (!get()._hasHydrated) {
            enqueueAction(action);
          } else {
            action();
          }
        },
        splitMinutesText: (segmentIndex, segmentTextIndex) => {
          const action = () => {
            set((state) => ({
              discussion: splitMinutesText(
                state.discussion,
                segmentIndex,
                segmentTextIndex
              ),
            }));
          };
          if (!get()._hasHydrated) {
            enqueueAction(action);
          } else {
            action();
          }
        },
        mergeUpMinutesText: (segmentIndex, segmentTextIndex) => {
          const action = () => {
            set((state) => ({
              discussion: mergeUpMinutesText(
                state.discussion,
                segmentIndex,
                segmentTextIndex
              ),
            }));
          };
          if (!get()._hasHydrated) {
            enqueueAction(action);
          } else {
            action();
          }
        },

        // == MinutesDispatch ==
        deleteMinutes: () => {
          const action = () => {
            useMinutesStoreCore(minutesStartTimestamp).persist.clearStorage();
          };
          if (!get()._hasHydrated) {
            enqueueAction(action);
          } else {
            action();
          }
        },
        createNewMinutes: () => {
          const action = () => {
            set({ _hasHydrated: false });
            const minutesStartTimestamp = Date.now();
            useMinutesStoreCore(minutesStartTimestamp).persist.setOptions({
              name: minutesStartTimestamp.toString(),
            });
            (
              useMinutesStoreCore(
                minutesStartTimestamp
              ).persist.rehydrate() as Promise<void>
            ).then(() => {
              set({
                ...initMinutesState(minutesStartTimestamp),
                assistants: SystemDefaultTemplate.map((template) => ({
                  ...template.config,
                  assistantId: uuidv4(),
                })),
              });
            });
          };
          if (!get()._hasHydrated) {
            enqueueAction(action);
          } else {
            action();
          }
        },
        openHomeMenu: () => {
          const action = () => {
            set(NoMinutesState);
          };
          if (!get()._hasHydrated) {
            enqueueAction(action);
          } else {
            action();
          }
        },
        openMinutes: (minutesStartTimestamp) => {
          const action = () => {
            set({ _hasHydrated: false });
            useMinutesStoreCore(minutesStartTimestamp).persist.setOptions({
              name: minutesStartTimestamp.toString(),
            });
            useMinutesStoreCore(minutesStartTimestamp).persist.rehydrate();
          };
          if (!get()._hasHydrated) {
            enqueueAction(action);
          } else {
            action();
          }
        },
      })),
      {
        name: minutesStartTimestamp.toString(),
        storage: createJSONStorage(
          () => MinutesPersistStorage,
          ExpandJSONOptions
        ),
        onRehydrateStorage: (state) => {
          return (state, error) => {
            if (error) {
              console.error(
                "useMinutesStoreCore: An error happened during hydration",
                state?.startTimestamp,
                error
              );
            } else if (state) {
              state._setHasHydrated(true);
              console.log("useMinutesStoreCore: rehydrated", state);
            }
          };
        },
      }
    )
  );
};
