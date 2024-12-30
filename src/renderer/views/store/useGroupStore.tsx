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
import { produce } from "immer";
import { v4 as uuidv4 } from "uuid";
import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  subscribeWithSelector,
} from "zustand/middleware";
import { ExpandJSONOptions, HydrateState } from "./IDBKeyValPersistStorage.jsx";

// == Store ==
import { createStore, del, get, set } from "idb-keyval";
import { StateStorage } from "zustand/middleware";
import { useMinutesAssistantStore } from "./useAssistantsStore.jsx";
import { useMinutesContentStore } from "./useContentStore.jsx";
import { useMinutesStore } from "./useMinutesStore.jsx";
import { useVBStore } from "./useVBStore.jsx";

// == Group ==
export type Group = {
  id: string;
  name: string;
};

// === IDBKeyVal ===
//  Custom storage object
const groupIDBStore = createStore("minutes_group", "group");
const GroupPersistStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    //console.log("GroupPersistStorage.getItem", name);
    return (await get(name, groupIDBStore)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    //console.log("GroupPersistStorage.setItem:", name, value);
    await set(name, value, groupIDBStore);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name, groupIDBStore);
  },
};

// == MinutesGroupStore ==
export type MinutesGroupStore = {
  groupMap: Map<string, Group>;
};

export type GroupDispatchStore = {
  setGroup: (group: Group) => void;
  getGroup: (id: string) => Group | undefined;
  getAllGroup: () => Group[];
  removeGroup: (id: string) => void;
  removeUnnecessaryGroup: () => void;
  delete: () => void;
};

const storeCache = new Map<
  number,
  ReturnType<typeof useMinutesGroupStoreCore>
>();

export const useMinutesGroupStore = (startTimestamp: number) => {
  let newStore;
  if (storeCache.has(startTimestamp)) {
    // 既にキャッシュに存在する場合はそれを利用
    newStore = storeCache.get(startTimestamp)!;
  } else {
    // ない場合は新たに作成してキャッシュに保存
    newStore = useMinutesGroupStoreCore(startTimestamp);
    storeCache.set(startTimestamp, newStore);
  }
  return newStore;
};

type GroupAction = () => void;
const useMinutesGroupStoreCore = (minutesStartTimestamp: number) => {
  //console.log("useMinutesGroupStoreCore", minutesStartTimestamp);
  // Hydration が完了するまでの操作を保存する Queue
  const actionQueue: GroupAction[] = [];

  // Queue に操作を積むメソッド
  const enqueueAction = (action: GroupAction) => {
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

  return create<MinutesGroupStore & GroupDispatchStore & HydrateState>()(
    persist(
      subscribeWithSelector((set, get, api) => ({
        // Hydration state
        hasHydrated: false,
        setHasHydrated: (state) => {
          set({
            hasHydrated: state,
          });
          if (state) {
            flushQueue(); // Queue に積まれた操作を実行
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
        groupMap: new Map<string, Group>(),
        setGroup: (group) => {
          const action = () => {
            set((state: MinutesGroupStore) => {
              const newGroupMap = new Map(state.groupMap); // Mapをコピーして不変データとして扱う
              newGroupMap.set(group.id, group);
              return { groupMap: newGroupMap };
            });
          };

          // Hydration が完了していない場合は Queue に積む
          if (!get().hasHydrated) {
            enqueueAction(action);
          } else {
            action(); // 完了していればすぐに実行
          }
        },
        getGroup: (id) => get().groupMap.get(id),
        getAllGroup: () => Array.from(get().groupMap.values()),
        removeGroup: (id) => {
          const action = () => {
            set(
              produce((state: MinutesGroupStore) => {
                state.groupMap.delete(id);
              })
            );
          };

          // Hydration が完了していない場合は Queue に積む
          if (!get().hasHydrated) {
            enqueueAction(action);
          } else {
            action(); // 完了していればすぐに実行
          }
        },
        removeUnnecessaryGroup: () => {
          const action = () => {
            set(
              produce((state: MinutesGroupStore) => {
                const usedIDMap = new Map<string, string>();

                useMinutesContentStore(minutesStartTimestamp)
                  .getState()
                  .getAllContent()
                  .forEach((content) => {
                    content.groupIds.forEach((id) => {
                      usedIDMap.set(id, id);
                    });
                  });

                useMinutesAssistantStore(minutesStartTimestamp)
                  .getState()
                  .assistantsMap.forEach((assistant) => {
                    assistant.messages?.forEach((message) => {
                      (message.groupIds ?? []).forEach((id) => {
                        usedIDMap.set(id, id);
                      });
                    });
                  });

                useMinutesStore(minutesStartTimestamp)
                  .getState()
                  .topics.forEach((topic) => {
                    (topic.groupIds ?? []).forEach((id) => {
                      usedIDMap.set(id, id);
                    });
                  });

                return {
                  groupMap: new Map(
                    Array.from(state.groupMap.values())
                      .filter((group) => usedIDMap.has(group.id))
                      .map((group) => [group.id, group])
                  ),
                };
              })
            );
          };

          // Hydration が完了していない場合は Queue に積む
          if (!get().hasHydrated) {
            enqueueAction(action);
          } else {
            action(); // 完了していればすぐに実行
          }
        },

        delete: () => {
          api.persist.clearStorage();
          storeCache.delete(minutesStartTimestamp);
        },
      })),
      {
        name: minutesStartTimestamp.toString(),
        storage: createJSONStorage(
          () => GroupPersistStorage,
          ExpandJSONOptions
        ),
        onRehydrateStorage: (state) => {
          return (state, error) => {
            if (error) {
              console.error(
                "useMinutesGroupStoreCore: An error happened during hydration",
                minutesStartTimestamp,
                error
              );
            } else if (state) {
              state.setHasHydrated(true);
              useVBStore.getState().setHydrated("group");
              console.log(
                "useMinutesGroupStoreCore: rehydrated",
                minutesStartTimestamp,
                state
              );
            }
          };
        },
      }
    )
  );
};

export function makeDefaultGroup(name?: string): Group {
  const groupName = name || "Default Group";
  return {
    id: uuidv4(),
    name: groupName,
  };
}
