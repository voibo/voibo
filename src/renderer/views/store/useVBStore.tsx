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
import { Segment } from "../../../common/Segment.jsx";

// ==== VB Core ====

export const NO_MINUTES_START_TIMESTAMP = 0; // MinutesState

export type VBStateMode = "home" | "recordingStudio";

export type VBState = {
  // current minutes start timestamp.
  // if no minutes, it is NO_MINUTES_START_TIMESTAMP
  startTimestamp: number;

  // gui
  mode: VBStateMode;
  mainMenuOpen: boolean;
  recording: boolean;
  playWavMute: boolean;

  // config
  // == audio ==
  audioFolder: string;
  audioSettingsDialogOpen: boolean;
  // == Topic ==
  interimSegment: Segment | null;
  // == zustand subscript ==
  //lastAction: VBAction | null;
};

type VBDispatch = {
  //vbDispatch: (action: VBAction) => void;
  isNoMinutes: () => boolean;
};

export const useVBStore = create<VBState & VBDispatch>()(
  subscribeWithSelector((set, get) => ({
    // # State
    startTimestamp: NO_MINUTES_START_TIMESTAMP,

    // gui
    mode: "home",
    mainMenuOpen: true,
    recording: false,
    playWavMute: true,

    // config
    // == audio ==
    audioFolder: "/",
    audioSettingsDialogOpen: false,
    // == Topic ==
    interimSegment: null,
    // == zustand subscript ==
    //lastAction: null,

    //vbDispatch: (action) => VBActionProcessor(action),
    isNoMinutes: () => get().startTimestamp === NO_MINUTES_START_TIMESTAMP,
  }))
);
