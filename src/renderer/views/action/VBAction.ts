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
import { Segment } from "../../../common/discussion.js";
import { useVBStore } from "../store/useVBStore.jsx";
import { ActionBase } from "./ActionBase.jsx";

export type VBAction =
  | ActionBase<"setAudioFolder", { audioFolder: string }>
  | ActionBase<"changeVBSettingsDialogOpen">
  | ActionBase<"togglePlayWavMute">
  | ActionBase<"updateInterimSegment", { segment: Segment }>;

export const processVBAction = async (action: VBAction) => {
  switch (action.type) {
    case "changeVBSettingsDialogOpen":
      useVBStore.setState({
        vbSettingsDialogOpen: !useVBStore().vbSettingsDialogOpen,
      });
      break;
    case "setAudioFolder":
      useVBStore.setState({
        audioFolder: action.payload.audioFolder,
      });
      break;
    case "togglePlayWavMute":
      useVBStore.setState({
        playWavMute: !useVBStore().playWavMute,
      });
      break;
    case "updateInterimSegment":
      useVBStore.setState({
        interimSegment: action.payload.segment,
      });
      break;

    default:
      console.warn("vbActionProcessor: unexpected default", action);
  }
};
