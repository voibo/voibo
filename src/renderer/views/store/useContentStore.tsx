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
import { Content } from "../../../common/content/content.js";

// === IDBKeyVal ===
//  Custom storage object
const contentIDBStore = createStore("minutes_content", "content");
const ContentPersistStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    //console.log("ContentPersistStorage.getItem", name);
    return (await get(name, contentIDBStore)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    //console.log("ContentPersistStorage.setItem:", name, value);
    await set(name, value, contentIDBStore);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name, contentIDBStore);
  },
};

// == MinutesContentStore ==
// ユーザが作成したコンテンツ「だけ」を管理する。Assistantのメッセージは AssistantStore で管理する。
export type MinutesContentStore = {
  contentMap: Map<string, Content>;
};

export type ContentDispatchStore = {
  setContent: (content: Content) => void;
  getContent: (id: string) => Content | undefined;
  getAllContent: () => Content[];
  removeContent: (id: string) => void;
};

const storeCache = new Map<
  number,
  ReturnType<typeof useMinutesContentStoreCore>
>();
export const useMinutesContentStore = (minutesStartTimestamp: number) => {
  let newStore;
  if (storeCache.has(minutesStartTimestamp)) {
    // 既にキャッシュに存在する場合はそれを利用
    newStore = storeCache.get(minutesStartTimestamp)!;
  } else {
    // ない場合は新たに作成してキャッシュに保存
    newStore = useMinutesContentStoreCore(minutesStartTimestamp);
    storeCache.set(minutesStartTimestamp, newStore);
  }
  return newStore;
};

type ContentAction = () => void;
const useMinutesContentStoreCore = (minutesStartTimestamp: number) => {
  //console.log("useMinutesContentStoreCore", minutesStartTimestamp);
  // Hydration が完了するまでの操作を保存する Queue
  const actionQueue: ContentAction[] = [];

  // Queue に操作を積むメソッド
  const enqueueAction = (action: ContentAction) => {
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

  return create<MinutesContentStore & ContentDispatchStore & HydrateState>()(
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
        contentMap: new Map<string, Content>(),
        setContent: (content) => {
          const action = () => {
            set((state: MinutesContentStore) => {
              const newContentMap = new Map(state.contentMap); // Mapをコピーして不変データとして扱う
              newContentMap.set(content.id, content);
              return { contentMap: newContentMap };
            });
          };

          // Hydration が完了していない場合は Queue に積む
          if (!get().hasHydrated) {
            enqueueAction(action);
          } else {
            action(); // 完了していればすぐに実行
          }
        },
        getContent: (id) => get().contentMap.get(id),
        getAllContent: () => Array.from(get().contentMap.values()),
        removeContent: (id) => {
          const action = () => {
            set(
              produce((state: MinutesContentStore) => {
                state.contentMap.delete(id);
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
      })),
      {
        name: minutesStartTimestamp.toString(),
        storage: createJSONStorage(
          () => ContentPersistStorage,
          ExpandJSONOptions
        ),
        onRehydrateStorage: (state) => {
          return (state, error) => {
            if (error) {
              console.error(
                "An error happened during hydration",
                minutesStartTimestamp,
                error
              );
            } else if (state) {
              state.setHasHydrated(true);
            }
          };
        },
      }
    )
  );
};
