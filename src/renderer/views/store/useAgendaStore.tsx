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
  StateStorage,
  persist,
  subscribeWithSelector,
} from "zustand/middleware";
import { createStore, del, get, set } from "idb-keyval";
import { ExpandJSONOptions, HydrateState } from "./IDBKeyValPersistStorage.jsx";
import {
  Agenda,
  AgendaStatus,
  TimeRange,
} from "../../../common/content/agenda.js";
import { useTranscribeStore } from "./useTranscribeStore.jsx";
import { useVBStore } from "./useVBStore.jsx";

// === IDBKeyVal ===
//  Custom storage object
const agendaIDBStore = createStore("minutes_agenda", "agenda");
const AgendaPersistStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name, agendaIDBStore)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    //console.log("AgendaPersistStorage.setItem:", name, value);
    await set(name, value, agendaIDBStore);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name, agendaIDBStore);
  },
};

// == Agenda Manager ==
type DiscussingAgenda = {
  agendaId: string;
  startUTC: number;
};

export type DiscussingAgendaStoreAction = {
  startDiscussion: (agendaId: string) => void;
  endDiscussion: (agendaId: string) => void;
  getDiscussingAgenda: () => DiscussingAgenda | undefined;
  setDiscussingAgenda: (discussing: DiscussingAgenda | undefined) => void;
  getDiscussedAgendas: (timeRange: TimeRange) => Agenda[];
};

export type AgendaStoreAction = {
  setAgenda: (agenda: Agenda) => void;
  getAgenda: (agendaId: string) => Agenda | undefined;
  getAllAgendas: () => Agenda[];
  removeAgenda: (agendaId: string) => void;
};

export type MinutesAgenda = {
  // data
  minutesStartTimestamp: number | undefined;
  agendaMap: Map<string, Agenda>;
  discussing: DiscussingAgenda | undefined;
};

// 永続化されるデータ
export type AgendasIDB = {
  agendas: Map<string, MinutesAgenda>;
};

export type AgendaStore = AgendasIDB &
  AgendaStoreAction &
  HydrateState &
  DiscussingAgendaStoreAction &
  HydrateState;

const storeCache = new Map<number, ReturnType<typeof useAgendaStoreCore>>();
export const useMinutesAgendaStore = (startTimestamp: number) => {
  let newStore;
  if (storeCache.has(startTimestamp)) {
    newStore = storeCache.get(startTimestamp)!;
  } else {
    newStore = useAgendaStoreCore(startTimestamp);
    storeCache.set(startTimestamp, newStore);
  }
  return newStore;
};

type AgendaAction = () => void;
const useAgendaStoreCore = (minutesStartTimestamp: number) => {
  //console.log("useMinutesContentStoreCore", minutesStartTimestamp);
  // Hydration が完了するまでの操作を保存する Queue
  const actionQueue: AgendaAction[] = [];

  // Queue に操作を積むメソッド
  const enqueueAction = (action: AgendaAction) => {
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

  return create<AgendaStore>()(
    persist(
      subscribeWithSelector((set, get, api) => ({
        // action
        getDiscussingAgenda: () => {
          const agendaStore = get().agendas.get(
            (useVBStore.getState().startTimestamp ?? 0).toString()
          );
          if (agendaStore) {
            return agendaStore.discussing;
          }
        },
        setDiscussingAgenda: (discussing) => {
          const minutesStartTimestamp = useVBStore.getState().startTimestamp;
          if (!minutesStartTimestamp) return;
          set(
            produce((state: AgendaStore) => {
              const currentAgendas = state.agendas.get(
                minutesStartTimestamp.toString()
              );
              if (!currentAgendas) return;
              currentAgendas.discussing = discussing;
            })
          );
        },

        startDiscussion: (agendaId) => {
          const minutesStartTimestamp =
            useVBStore.getState().startTimestamp ?? 0;
          const latestDiscussing = get().getDiscussingAgenda();
          if (latestDiscussing && latestDiscussing.agendaId !== agendaId) {
            // 前の会話を終了させて、新規に話し合いを開始
            const lastAgenda = get().getAgenda(latestDiscussing.agendaId);
            if (lastAgenda) {
              const timeRange: TimeRange = {
                startFromMStartMsec: latestDiscussing.startUTC,
                endFromMStartMsec: Date.now() - minutesStartTimestamp,
              };
              get().setAgenda({
                ...lastAgenda,
                status: "mayBeDone" as AgendaStatus,
                discussedTimes: [
                  ...(lastAgenda.discussedTimes ?? []),
                  timeRange,
                ],
              });
            }
          }
          // start new discussion
          // update currentAgenda status
          const currentAgenda = get().getAgenda(agendaId);
          if (currentAgenda) {
            get().setAgenda({
              ...currentAgenda,
              status: "inProgress" as AgendaStatus,
            });
          }
          // update discussing
          console.log("startDiscussion", agendaId);
          get().setDiscussingAgenda({
            agendaId: agendaId,
            startUTC: Date.now() - minutesStartTimestamp,
          });

          // enforce to change next segment
          useTranscribeStore.getState().splitTranscribe();
        },
        endDiscussion: (agendaId) => {
          const latestDiscussing = get().getDiscussingAgenda();
          console.log("endDiscussion", agendaId, latestDiscussing);
          if (latestDiscussing && latestDiscussing.agendaId == agendaId) {
            const minutesStartTimestamp =
              useVBStore.getState().startTimestamp ?? 0;
            const lastAgenda = get().getAgenda(agendaId);
            if (lastAgenda) {
              const timeRange: TimeRange = {
                startFromMStartMsec: latestDiscussing.startUTC,
                endFromMStartMsec: Date.now() - minutesStartTimestamp,
              };
              console.log("endDiscussion", agendaId, timeRange);
              get().setAgenda({
                ...lastAgenda,
                status: "mayBeDone" as AgendaStatus,
                discussedTimes: [
                  ...(lastAgenda.discussedTimes ?? []),
                  timeRange,
                ],
              });
              // update discussing
              get().setDiscussingAgenda(undefined);

              // enforce to change next segment
              useTranscribeStore.getState().splitTranscribe();
            }
          }
        },
        getDiscussedAgendas: (timeRange: TimeRange): Agenda[] => {
          const discussing = get().getDiscussingAgenda();
          return [
            // related agendas
            ...get()
              .getAllAgendas()
              .flatMap((agenda) =>
                agenda.discussedTimes.map((timeRange) => ({
                  timeRange: timeRange,
                  agendaId: agenda.id,
                }))
              )
              .filter(
                (elem) =>
                  elem.timeRange.endFromMStartMsec >=
                    timeRange.startFromMStartMsec &&
                  elem.timeRange.startFromMStartMsec <=
                    timeRange.endFromMStartMsec
              )
              .map((elem) => get().getAgenda(elem.agendaId)!),
            // Is current discussing agenda included?
            ...(discussing && discussing.startUTC <= timeRange.endFromMStartMsec
              ? [get().getAgenda(discussing.agendaId)!]
              : []),
          ];
        },

        // == Agenda IDB ==
        // data
        agendas: new Map<string, MinutesAgenda>(),

        // action
        setAgenda: (agenda) => {
          const minutesStartTimestamp = useVBStore.getState().startTimestamp;
          if (!minutesStartTimestamp) return;
          set(
            produce((state) => {
              const currentAgendas = state.agendas.get(
                minutesStartTimestamp.toString()
              );
              if (!currentAgendas) {
                const newAgendas: MinutesAgenda = {
                  minutesStartTimestamp: minutesStartTimestamp,
                  agendaMap: new Map<string, Agenda>(),
                  discussing: undefined,
                };
                newAgendas.agendaMap.set(agenda.id, agenda);
                state.agendas.set(minutesStartTimestamp.toString(), newAgendas);
              } else {
                state.agendas
                  .get(minutesStartTimestamp.toString())
                  .agendaMap.set(agenda.id, agenda);
              }
              //console.log("useAgendaStore: setAgenda", minutesStartTimestamp);
            })
          );
        },
        getAgenda: (agendaId) => {
          const minutesStartTimestamp = useVBStore.getState().startTimestamp;
          if (!minutesStartTimestamp) return undefined;
          const currentAgendas = get().agendas.get(
            minutesStartTimestamp.toString()
          );
          let target = currentAgendas?.agendaMap.get(agendaId);
          /*
        console.log(
          "useAgendaStore: getOrInitAgenda: ",
          minutesStartTimestamp,
          target
        );
        */
          return target;
        },
        getAllAgendas: () => {
          const minutesStartTimestamp = useVBStore.getState().startTimestamp;
          if (!minutesStartTimestamp) return [];
          const currentAgendas = get().agendas.get(
            minutesStartTimestamp.toString()
          );
          if (!currentAgendas) return [];
          return Array.from(currentAgendas.agendaMap.values());
        },
        removeAgenda: (agendaId) => {
          const minutesStartTimestamp = useVBStore.getState().startTimestamp;
          if (!minutesStartTimestamp) return;
          set(
            produce((state) => {
              const currentAgendas = state.agendas.get(
                minutesStartTimestamp.toString()
              );
              if (!currentAgendas) return;
              currentAgendas.agendaMap.delete(agendaId);
              //console.log("useAgendaStore: removeAgenda", minutesStartTimestamp);
            })
          );
        },

        // Hydrate
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
      })),
      {
        name: minutesStartTimestamp.toString(),
        storage: createJSONStorage(
          () => AgendaPersistStorage,
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
              console.log(
                "useAgendaStoreCore: rehydrated",
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
