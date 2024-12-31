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
import { subscribeWithSelector } from "zustand/middleware";
import { Segment } from "../../../common/discussion.js";

// ==== VB Core ====

export const NO_MINUTES_START_TIMESTAMP = 0;

export type IDB_NAMES =
  | "minutes"
  | "agenda"
  | "assistant"
  | "content"
  | "group";

export type VBState = {
  // current minutes start timestamp.
  // if no minutes, it is NO_MINUTES_START_TIMESTAMP
  startTimestamp: number;
  allReady: boolean;
  hydrated: Map<IDB_NAMES, boolean>;

  // gui
  vbSettingsDialogOpen: boolean;
  recording: boolean;
  playWavMute: boolean;

  // config
  // == audio ==
  audioFolder: string;
  // == Topic ==
  interimSegment: Segment | null;
};

type VBDispatch = {
  isNoMinutes: () => boolean;
  isNoMinutesStartTimestamp: (startTimestamp: number) => boolean;
  setHydrated: (name: IDB_NAMES) => void;
};

export const useVBStore = create<VBState & VBDispatch>()(
  subscribeWithSelector((set, get) => ({
    startTimestamp: NO_MINUTES_START_TIMESTAMP,
    allReady: false,
    hydrated: new Map<IDB_NAMES, boolean>([
      ["minutes", false],
      ["agenda", false],
      ["assistant", false],
      ["content", false],
      ["group", false],
    ]),

    // gui
    mainMenuOpen: true,
    vbSettingsDialogOpen: false,
    recording: false,
    playWavMute: true,

    // config
    // == audio ==
    audioFolder: "/",
    // == Topic ==
    interimSegment: null,

    // utils
    isNoMinutes: () => get().startTimestamp === NO_MINUTES_START_TIMESTAMP,
    isNoMinutesStartTimestamp: (startTimestamp: number) =>
      startTimestamp === NO_MINUTES_START_TIMESTAMP,
    setHydrated: (name: IDB_NAMES) => {
      const hydrated = get().hydrated;
      hydrated.set(name, true);
      set({ hydrated });
      set({ allReady: Array.from(hydrated.values()).every((v) => v) });
    },
  }))
);
