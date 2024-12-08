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
import { del, get, set } from "idb-keyval";
import { StateStorage } from "zustand/middleware";

// === IDBKeyVal ===
//  Custom storage object
export const IDBKeyValPersistStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    //console.log("IDBKeyValPersistStorage: getItem", name);
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    //console.log("IDBKeyValPersistStorage: setItem", name, value);
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

// Key of IDBKeyVal
export const IDBKeyValKeys = {
  AGENDAS_STORE: "agendas",
  SETTINGS_STORE: "settings",
  MINUTES_TITLE_STORE: "minutesTitle",
};

// === Hydrate ===
export type HydrateState = {
  _hasHydrated: boolean;
  _setHasHydrated: (state: boolean) => void;
};

// JSON storage options for createJSONStorage

export const decodeExpandJSON = (key: string, value: unknown): unknown => {
  if (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    "value" in value
  ) {
    if (
      value.type === "Map" &&
      typeof value.value === "object" &&
      value.value !== null
    ) {
      return new Map(Object.entries(value.value));
    }
  }
  return value;
};

export const encodeExpandJSON = (key: string, value: unknown): unknown => {
  if (value instanceof Map) {
    return { type: "Map", value: Object.fromEntries(value) };
  }
  return value;
};

export const ExpandJSONOptions = {
  reviver: decodeExpandJSON,
  replacer: encodeExpandJSON,
};
