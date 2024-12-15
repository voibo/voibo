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
  subscribeWithSelector,
} from "zustand/middleware";
import {
  ExpandJSONOptions,
  HydrateState,
  IDBKeyValKeys,
  IDBKeyValPersistStorage,
} from "./IDBKeyValPersistStorage.jsx";

// == VADSettingsState ==

export type VADSettingsState = {
  positiveSpeechThreshold: number;
  negativeSpeechThreshold: number;
  preSpeechPadFrames: number;
  minSpeechFrames: number;
  redemptionFrames: number;
};

export const VADSettingsDefault: VADSettingsState = {
  positiveSpeechThreshold: 0.55, // 確率
  negativeSpeechThreshold: 0.4, // 確率
  // == 0.096 sec / 1 frame => about 0.1 sec ==
  preSpeechPadFrames: 3,
  minSpeechFrames: 3,
  redemptionFrames: 4,
};

export type VADSettingsAction = {
  type: "setVADSettings";
  payload: Partial<VADSettingsState>;
};

// == AudioDeviceSettings ==

export type AudioDeviceSettingsState = {
  selectedOwnDeviceId: string;
  selectedParticipantsDeviceId: string;
  selectedOutputDeviceId: string;
};

export const AudioDeviceSettingsDefault: AudioDeviceSettingsState = {
  selectedOwnDeviceId: "default",
  selectedParticipantsDeviceId: "default",
  selectedOutputDeviceId: "default",
};

export type AudioDeviceSettingsAction = {
  type: "setMicSettings";
  payload: Partial<AudioDeviceSettingsState>;
};

// == DecibelDividerSetting ==

export type DecibelDividerSettingState = {
  silenceLevel: number; //db
  silenceLength: number; // sec
  maxLength: number; // sec
  minLength: number;
};

export const DecibelDividerSettingDefault: DecibelDividerSettingState = {
  silenceLevel: -60, //db
  silenceLength: 0.5, // sec
  maxLength: 30, // sec
  minLength: 5, // sec
};

// === Store ==

export type VBSettingsStoreAction = {
  settingDispatch: (
    action: AudioDeviceSettingsAction | VADSettingsAction
  ) => void;
};

export const useVBSettingsStore = create<
  AudioDeviceSettingsState &
    VADSettingsState &
    DecibelDividerSettingState &
    VBSettingsStoreAction &
    HydrateState
>()(
  persist(
    subscribeWithSelector((set, get, api) => ({
      // state
      ...AudioDeviceSettingsDefault,
      ...VADSettingsDefault,
      ...DecibelDividerSettingDefault,

      // action
      settingDispatch: (action) => {
        set((state) => {
          switch (action.type) {
            case "setVADSettings":
            case "setMicSettings":
              return { ...state, ...action.payload };
          }
        });
      },

      // Hydrate
      hasHydrated: false,
      setHasHydrated: (state) => {
        set({
          hasHydrated: state,
        });
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
      name: IDBKeyValKeys.SETTINGS_STORE,
      storage: createJSONStorage(
        () => IDBKeyValPersistStorage,
        ExpandJSONOptions
      ),
      onRehydrateStorage: (state) => {
        //console.log("hydration starts");
        return (state, error) => {
          if (error) {
            console.error("an error happened during hydration", error);
          } else if (state) {
            state.setHasHydrated(true);
          }
        };
      },
    }
  )
);
