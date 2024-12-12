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
import { AudioDeviceSettingsDefault } from "../setting/AudioDeviceSettings.jsx";
import { DecibelDividerSettingDefault } from "../setting/DecibelDividerSetting.jsx";
import { VADSettingsDefault } from "../setting/VADSettings.jsx";
import { VFSettingsAction, VBSettingsState } from "../setting/VFSettings.jsx";
import {
  ExpandJSONOptions,
  HydrateState,
  IDBKeyValKeys,
  IDBKeyValPersistStorage,
} from "./IDBKeyValPersistStorage.jsx";

export type VFSettingsStoreAction = {
  settingDispatch: (action: VFSettingsAction) => void;
};

export type VFSettingsStore = VBSettingsState &
  VFSettingsStoreAction &
  HydrateState;
export const useVFSettingsStore = create<VFSettingsStore>()(
  persist(
    subscribeWithSelector((set, get) => ({
      // state
      ...AudioDeviceSettingsDefault,
      ...VADSettingsDefault,
      ...DecibelDividerSettingDefault,

      // action
      settingDispatch: (action) => {
        set((state: VFSettingsStore) => {
          switch (action.type) {
            case "setVADSettings":
            case "setMicSettings":
              return { ...state, ...action.payload };
          }
        });
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
            state._setHasHydrated(true);
          }
        };
      },
    }
  )
);
