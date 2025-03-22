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
import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  StateStorage,
  subscribeWithSelector,
} from "zustand/middleware";
import { createStore, del, get, set } from "idb-keyval";
import { v4 as uuidv4 } from "uuid";
import { ExpandJSONOptions, HydrateState } from "./IDBKeyValPersistStorage.jsx";
import { NO_MINUTES_START_TIMESTAMP, useVBStore } from "./useVBStore.jsx";
import {
  EnglishTopicPrompt,
  TopicInvokeParam,
  TopicSchema,
} from "../../../common/content/assisatant.js";
import { SystemDefaultTemplate } from "../component/assistant/AssistantTemplates.js";
import { AIConfig } from "../component/common/aiConfig.jsx";
import {
  changeTopicStartedPoint,
  mergeUpMinutesText,
  removeMinutesText,
  splitMinutesText,
  updateMinutesText,
} from "../../../common/discussion.js";
import { DiscussionSegment } from "../../../common/discussion.js";
import {
  DefaultSplitter,
  DiscussionSplitterConf,
} from "../component/topic/DiscussionSplitter.jsx";
import {
  isLLMAnalyzedTopics,
  LLMAnalyzedTopics,
  Topic,
  TopicRequest,
  TopicSeed,
} from "../../../common/content/topic.js";
import { VirtualAssistantConf } from "./useAssistantsStore.jsx";
import { useMinutesAgendaStore } from "./useAgendaStore.jsx";
import { processTopicAction } from "../action/TopicAction.js";
import { IPCInvokeKeys, IPCReceiverKeys } from "../../../common/constants.js";
import { ScreenCapture } from "../../../common/content/screencapture.js";

// === IDBKeyVal ===
//  Custom storage object
const minutesIDBStore = createStore("minutes", "minutes");
const MinutesPersistStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name, minutesIDBStore)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    const current = await get(name, minutesIDBStore);
    if (current === value) {
      console.log("MinutesPersistStorage.setItem: same value skipped", name);
      return;
    }
    await set(name, value, minutesIDBStore);
  },
  removeItem: async (name: string): Promise<void> => {
    console.warn("MinutesPersistStorage: removeItem", name);
    await del(name, minutesIDBStore);
  },
};

// === State ===
type MinutesState = {
  startTimestamp: number;
  discussionSplitter: DiscussionSplitterConf;
  discussion: DiscussionSegment[];
  topicAIConf: AIConfig;
  topics: Topic[];
  assistants: VirtualAssistantConf[];
};

type TopicManagerState = {
  // res: state
  topicProcessing: boolean;
  topicError: Error | null;
  topicRes: {
    data: LLMAnalyzedTopics;
  } | null;

  // request prompt queue
  topicPrompts: TopicRequest[];

  // seed
  topicSeeds: TopicSeed[];
};

type ScreenCaptureState = {
  capturedScreens: ScreenCapture[];
};

export type MinutesStore = MinutesState &
  TopicManagerState &
  ScreenCaptureState;

const initMinutesState = (startTimestamp: number): MinutesStore => {
  return {
    // MinutesState
    startTimestamp: startTimestamp,
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

    // TopicManagerState
    topicProcessing: false,
    topicError: null,
    topicRes: null,
    topicPrompts: [],
    topicSeeds: [],

    // ScreenCaptureState
    capturedScreens: [],
  };
};

export type MinutesDispatchStore = TopicManagerDispatch &
  AssistantConfDispatch &
  DiscussionSplitterConfDispatch &
  TopicAIConfDispatch &
  TopicDispatch &
  DiscussionDispatch &
  MinutesDispatch &
  ScreenCaptureDispatch;

type TopicManagerDispatch = {
  updateTopicSeeds: (props: {
    enforceUpdateAll: boolean;
    includeLastSeed: boolean;
  }) => void;
  startTopicProcess: () => void;
  processTopic: () => Promise<void>;
  resTopicError: (props: {
    error: Error;
    prompts: TopicRequest[];
    topicSeed: TopicSeed[];
  }) => void;
  resTopicSuccess: (props: {
    res: { data: LLMAnalyzedTopics };
    prompts: TopicRequest[];
    topicSeed: TopicSeed[];
  }) => void;
};

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
  setMinutesLines: (minutes: DiscussionSegment[], isStopped: boolean) => void;
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
  delete: () => void;
  createNewMinutes: () => void;
  waitForHydration: () => Promise<void>;
  isNoMinutes: () => boolean;
};

type ScreenCaptureDispatch = {
  addScreenCapture: (capture: ScreenCapture) => void;
};

// Zustand Store

const storeCache = new Map<number, ReturnType<typeof useMinutesStoreCore>>();
export const useMinutesStore = (minutesStartTimestamp: number) => {
  let newStore;
  if (storeCache.has(minutesStartTimestamp)) {
    newStore = storeCache.get(minutesStartTimestamp)!;
  } else {
    newStore = useMinutesStoreCore(minutesStartTimestamp);
    storeCache.set(minutesStartTimestamp, newStore);
  }
  return newStore;
};

type QueuedAction = () => void;
const useMinutesStoreCore = (minutesStartTimestamp: number) => {
  //console.log("useMinutesStoreCore", minutesStartTimestamp);
  let actionQueue: QueuedAction[] = [];
  const enqueueAction = (action: QueuedAction) => {
    actionQueue.push(action);
  };
  const clearQueue = () => {
    actionQueue = [];
  };
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
      subscribeWithSelector((set, get, api) => ({
        // Hydration
        hasHydrated: false,
        setHasHydrated: (state) => {
          set({
            hasHydrated: state,
          });
          if (state) {
            flushQueue();
          }
        },
        waitForHydration: async () => {
          const store = get();
          if (store.hasHydrated) {
            return Promise.resolve();
          }
          return new Promise<void>((resolve) => {
            const unsubscribe = api.subscribe(
              (state) => state.hasHydrated,
              (hasHydrated) => {
                if (hasHydrated) {
                  unsubscribe();
                  resolve();
                }
              }
            );
          });
        },

        // State
        ...initMinutesState(minutesStartTimestamp),

        // Dispatch
        // == AssistantConfDispatch ==
        addVirtualAssistantConf: (assistant) => {
          const action = () => {
            set((state) => ({ assistants: [...state.assistants, assistant] }));
          };
          if (!get().hasHydrated) {
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
          if (!get().hasHydrated) {
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
          if (!get().hasHydrated) {
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
          if (!get().hasHydrated) {
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
          if (!get().hasHydrated) {
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
          if (!get().hasHydrated) {
            enqueueAction(action);
          } else {
            action();
          }
        },
        deleteAllTopic: () => {
          const action = () => {
            set({ topics: [] });
          };
          if (!get().hasHydrated) {
            enqueueAction(action);
          } else {
            action();
          }
        },
        setTopic: (topics) => {
          const action = () => {
            set((state) => ({ topics: [...state.topics, ...topics] }));
          };
          if (!get().hasHydrated) {
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
          if (!get().hasHydrated) {
            enqueueAction(action);
          } else {
            action();
          }
        },

        // == DiscussionDispatch ==
        setMinutesLines: (minutes, isStopped) => {
          const action = () => {
            set((state) => ({ discussion: [...state.discussion, ...minutes] }));
            get().updateTopicSeeds({
              enforceUpdateAll: false,
              includeLastSeed: isStopped,
            });
          };
          if (!get().hasHydrated) {
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
          if (!get().hasHydrated) {
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
          if (!get().hasHydrated) {
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
          if (!get().hasHydrated) {
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
          if (!get().hasHydrated) {
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
          if (!get().hasHydrated) {
            enqueueAction(action);
          } else {
            action();
          }
        },

        // == MinutesDispatch ==
        isNoMinutes: () => {
          return get().startTimestamp === NO_MINUTES_START_TIMESTAMP;
        },

        createNewMinutes: () => {
          // 即時反映
          clearQueue();
          set({
            ...initMinutesState(minutesStartTimestamp),
            assistants: SystemDefaultTemplate.map((template) => ({
              ...template.config,
              assistantId: uuidv4(),
            })),
          });
        },
        delete: () => {
          clearQueue();
          api.persist.clearStorage();
          storeCache.delete(minutesStartTimestamp);
        },

        // == TopicManagerDispatch ==

        // action
        startTopicProcess: () => {
          if (!useVBStore.getState().allReady) return;
          set({ topicProcessing: true, topicError: null, topicRes: null });
        },

        processTopic: async () => {
          if (
            !useVBStore.getState().allReady ||
            useVBStore.getState().isNoMinutes()
          )
            return;
          const targetIndex = get().topicPrompts.findIndex(
            (v) => !v.isRequested
          );
          if (get().topicProcessing || targetIndex < 0) return;

          // start process
          get().startTopicProcess();

          // 非同期処理前に必要なデータを保存
          const currentPrompt = get().topicPrompts[targetIndex];
          if (!currentPrompt || !currentPrompt.seedData) {
            console.error("Invalid topic prompt or missing seedData");
            get().resTopicError({
              error: new Error("Invalid topic prompt data"),
              prompts: get().topicPrompts,
              topicSeed: get().topicSeeds,
            });
            return;
          }

          // 必要なデータを非同期処理の前に取得しておく
          const currentSeedData = currentPrompt.seedData;

          const startTimestamp = useVBStore.getState().startTimestamp;
          const getAgenda =
            useMinutesAgendaStore(startTimestamp).getState().getAgenda;
          const topicAIConf =
            useMinutesStore(startTimestamp).getState().topicAIConf;

          // make a request
          const currentTopic = get().topicPrompts[targetIndex];
          const topicRes = get().topicRes;
          let lastResult = "";
          if (topicRes && topicRes.data.topics.length > 0) {
            const lastTopic =
              topicRes.data.topics[topicRes.data.topics.length - 1];
            lastResult = `${lastTopic.title}\n\n ${
              Array.isArray(lastTopic.topic)
                ? lastTopic.topic.join("\n")
                : lastTopic.topic
            }`;

            if (lastTopic.seedData && lastTopic.seedData.agendaIdList) {
              lastTopic.seedData.agendaIdList.forEach((agendaId) => {
                const relatedAgenda = getAgenda(agendaId);
                console.log(
                  "useTopicManager: lastTopic agendaIdList",
                  relatedAgenda
                );
              });
            }
          }

          const prompt = `"""Immediate Previous Content\n${lastResult}\n"""\n\n"""Content\n${currentTopic.text}\n"""\n`;
          const updatePrompts = [...get().topicPrompts];
          updatePrompts[targetIndex].isRequested = true;
          await window.electron
            .invoke(IPCInvokeKeys.GET_TOPIC, {
              systemPrompt: get().topicAIConf.systemPrompt, // EnglishTopicPrompt
              structuredOutputSchema: topicAIConf.structuredOutputSchema,
              inputPrompt: prompt,
              modelType: topicAIConf.modelType,
              temperature: topicAIConf.temperature,
              difyConf: topicAIConf.difyConf,
              flowiseConf: topicAIConf.flowiseConf,
            } as TopicInvokeParam)
            .then((resJSON) => {
              console.log("useTopicManager: getTopic", resJSON);
              if (isLLMAnalyzedTopics(resJSON)) {
                resJSON.topics.forEach((topic) => {
                  topic.id = uuidv4();
                  topic.seedData = currentSeedData;
                  topic.agendaIds = currentSeedData.agendaIdList ?? [];
                });

                get().topicSeeds.forEach((seed) => {
                  if (seed == currentSeedData) {
                    seed.requireUpdate = false;
                  }
                });
                get().resTopicSuccess({
                  res: {
                    data: resJSON,
                  },
                  prompts: updatePrompts,
                  topicSeed: get().topicSeeds,
                });
              } else {
                console.error("resError: Invalid JSON data", resJSON);
                get().topicSeeds.forEach((seed) => {
                  if (seed == currentSeedData) {
                    seed.requireUpdate = false;
                  }
                });
                get().resTopicError({
                  error: new Error("Invalid JSON data"),
                  prompts: updatePrompts,
                  topicSeed: get().topicSeeds,
                });
              }
            })
            .catch((e) => {
              console.error("resError :general error", e);
              get().topicSeeds.forEach((seed) => {
                if (seed == currentSeedData) {
                  seed.requireUpdate = false;
                }
              });
              get().resTopicError({
                error: e,
                prompts: updatePrompts,
                topicSeed: get().topicSeeds,
              });
            });
        },

        updateTopicSeeds: (props: {
          enforceUpdateAll: boolean;
          includeLastSeed: boolean;
        }) => {
          const { enforceUpdateAll, includeLastSeed } = props;
          if (!useVBStore.getState().allReady) return;
          // 現在の全discussionから、全topicSeedを再構築する
          const topicSeeds: TopicSeed[] = [];
          const startTimestamp = useVBStore.getState().startTimestamp;
          const minutesStore = useMinutesStore(startTimestamp).getState();
          const duration: number = minutesStore.discussionSplitter.duration;
          minutesStore.discussion.forEach((segment) => {
            const currentStartTimestamp = Number(segment.timestamp);
            const currentEndTimestamp = segment.texts.reduce(
              (pre, current) => pre + Number(current.length) / 1000,
              currentStartTimestamp
            );
            const text = segment.texts.reduce(
              (inPrev, inCurrent) => inPrev + inCurrent.text,
              ""
            );
            if (segment.topicStartedPoint) {
              const newTopicSeed: TopicSeed = {
                startTimestamp: currentStartTimestamp,
                endTimestamp: currentEndTimestamp,
                text,
                requireUpdate: enforceUpdateAll,
                agendaIdList: [
                  ...useMinutesAgendaStore(startTimestamp)
                    .getState()
                    .getDiscussedAgendas({
                      startFromMStartMsec: currentStartTimestamp * 1000,
                      endFromMStartMsec: currentEndTimestamp * 1000,
                    })
                    .map((agenda) => agenda.id),
                ],
              };

              const currentSeed = get().topicSeeds.find(
                (currentSeed) =>
                  currentSeed.startTimestamp == newTopicSeed.startTimestamp &&
                  currentSeed.endTimestamp == newTopicSeed.endTimestamp &&
                  currentSeed.text == newTopicSeed.text
              );
              newTopicSeed.requireUpdate =
                currentSeed?.requireUpdate || enforceUpdateAll;

              topicSeeds.push(newTopicSeed);
              //console.log("updateTopicSeeds: topicStartedPoint", topicSeeds);
            } else if (topicSeeds.length > 0) {
              topicSeeds[topicSeeds.length - 1].endTimestamp =
                currentEndTimestamp;
              topicSeeds[topicSeeds.length - 1].text += "\n" + text;
            }
          });

          // 完全に完了したTopicSeedだけにする
          // そのため一番最後のTopicSeedは duration 以下なら強制的に更新対象から外す
          if (!includeLastSeed && topicSeeds.length > 0) {
            const lastSeed = topicSeeds[topicSeeds.length - 1];
            if (lastSeed.endTimestamp - lastSeed.startTimestamp < duration) {
              topicSeeds.pop();
            }
          }

          // 現在のtopicSeedsと比較して、変更があれば更新対象にする
          let updatedTopicSeed: TopicSeed[] = [];
          if (enforceUpdateAll) {
            updatedTopicSeed = topicSeeds;
          } else {
            topicSeeds.forEach((seed, index) => {
              const currentSeed = get().topicSeeds.find(
                (currentSeed) =>
                  currentSeed.startTimestamp == seed.startTimestamp &&
                  currentSeed.endTimestamp == seed.endTimestamp &&
                  currentSeed.text == seed.text
              );
              if (!currentSeed) {
                updatedTopicSeed.push({ ...seed, requireUpdate: true });
              } else {
                updatedTopicSeed.push(seed);
              }
            });
          }

          // 更新対象の topicSeed を TopicRequest に変換
          const targetTopicSeedRequests: TopicRequest[] = updatedTopicSeed
            .filter((seed) => seed.requireUpdate)
            .map((seed) => {
              return {
                text: seed.text,
                seedData: seed,
                isRequested: false,
              };
            });

          console.log(
            "updateTopicSeeds",
            targetTopicSeedRequests,
            updatedTopicSeed
          );

          set({
            topicPrompts: targetTopicSeedRequests,
            topicSeeds: updatedTopicSeed,
          });
        },

        resTopicSuccess: ({ res, prompts, topicSeed }) => {
          if (!useVBStore.getState().allReady) return;
          set({
            topicProcessing: false,
            topicError: null,
            topicRes: res,
            topicPrompts: prompts,
            topicSeeds: topicSeed,
          });

          // FIXME: exceptional handling
          // all actions should be called from store, but this is exceptional handling.
          processTopicAction({
            type: "setTopic",
            payload: {
              topics: res.data.topics,
            },
          });
        },

        resTopicError: ({ error, prompts, topicSeed }) => {
          if (!useVBStore.getState().allReady) return;
          set({
            topicProcessing: false,
            topicError: error,
            topicRes: null,
            topicPrompts: prompts,
            topicSeeds: topicSeed,
          });
        },

        // == ScreenCaptureDispatch ==
        addScreenCapture: (capture) => {
          if (!useVBStore.getState().allReady) return;
          set({
            capturedScreens: [...get().capturedScreens, capture],
          });
        },
      })),
      {
        name: minutesStartTimestamp.toString(),
        storage: createJSONStorage(
          () => MinutesPersistStorage,
          ExpandJSONOptions
        ),
        partialize: (state) => ({
          startTimestamp: state.startTimestamp,
          discussionSplitter: state.discussionSplitter,
          discussion: state.discussion,
          topicAIConf: state.topicAIConf,
          topics: state.topics,
          assistants: state.assistants,
          capturedScreens: state.capturedScreens,
        }),
        onRehydrateStorage: (state) => {
          return (state, error) => {
            if (error) {
              console.error(
                "useMinutesStoreCore: An error happened during hydration",
                state?.startTimestamp,
                error
              );
            } else if (state) {
              state.setHasHydrated(true);
              useVBStore.getState().setHydrated("minutes");
              console.log(
                "useMinutesStoreCore: rehydrated",
                state.startTimestamp,
                state
              );
            }
          };
        },
      }
    )
  );
};

window.electron.on(
  IPCReceiverKeys.ON_SCREEN_CAPTURED,
  (event: any, frame: ScreenCapture) => {
    const minutesStore = useMinutesStore(
      useVBStore.getState().startTimestamp
    ).getState();
    minutesStore.addScreenCapture(frame);
  }
);
