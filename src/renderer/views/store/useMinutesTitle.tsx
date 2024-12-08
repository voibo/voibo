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
import {
  ExpandJSONOptions,
  HydrateState,
  IDBKeyValKeys,
  IDBKeyValPersistStorage,
} from "./IDBKeyValPersistStorage.jsx";

export type MinutesTitle = {
  startTimestamp: number;
  title: string;
};

export type MinutesTitleStoreAction = {
  setMinutesTitle: (minutesTitle: MinutesTitle) => void;
  removeMinutesTitle: (startTimestamp: number) => void;
  getMinutesTitle: (startTimestamp: number) => string | undefined;
  getAllMinutesTitles: () => MinutesTitle[];
};

// 永続化されるデータ
export type MinutesTitles = {
  // data
  minutesTitleMap: Map<string, string>; // JSON化する時に key が string でないといけないため
};

export type MinutesTitleStore = MinutesTitles &
  MinutesTitleStoreAction &
  HydrateState;

export const useMinutesTitleStore = create<MinutesTitleStore>()(
  persist(
    subscribeWithSelector((set, get) => ({
      // == MinutesTitle IDB ==
      // data
      minutesTitleMap: new Map<string, string>(),

      // action
      setMinutesTitle: (minutesTitle) => {
        set(
          produce((state) => {
            (state.minutesTitleMap as Map<string, string>).set(
              minutesTitle.startTimestamp.toString(),
              minutesTitle.title
            );
          })
        );
      },
      removeMinutesTitle: (startTimestamp) => {
        set(
          produce((state) => {
            (state.minutesTitleMap as Map<string, string>).delete(
              startTimestamp.toString()
            );
          })
        );
      },
      getMinutesTitle: (startTimestamp) => {
        return get().minutesTitleMap.get(startTimestamp.toString());
      },
      getAllMinutesTitles: () => {
        return Array.from(get().minutesTitleMap.entries()).map(
          ([startTimestamp, title]) => {
            return { title, startTimestamp: Number(startTimestamp) };
          }
        );
      },

      // Hydrate
      _hasHydrated: false,
      _setHasHydrated: (state) => {
        set({
          _hasHydrated: state,
        });
      },
    })),
    {
      name: IDBKeyValKeys.MINUTES_TITLE_STORE,
      storage: createJSONStorage(
        () => IDBKeyValPersistStorage,
        ExpandJSONOptions
      ),
      partialize: (state) => {
        return {
          minutesTitleMap: state.minutesTitleMap,
        };
      },
      onRehydrateStorage: (state) => {
        return (state, error) => {
          if (error) {
            console.error("an error happened during hydration", error);
          } else if (state) {
            console.log("useMinutesTitleStore hydrated");
            state._setHasHydrated(true);
          }
        };
      },
    }
  )
);
