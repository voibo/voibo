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
import { v4 as uuidv4 } from "uuid";

export type VBAccount = {
  id: string;
  name: string;
  avatarImage?: string;
};

export type VBUser = VBAccount; // in the future, we may have more user specific settings

export type AudioDeviceSettings = {
  selectedOwnDeviceId: string;
  selectedParticipantsDeviceId: string;
  selectedOutputDeviceId: string;
};

export const AudioDeviceSettingsDefault: AudioDeviceSettings = {
  selectedOwnDeviceId: "default",
  selectedParticipantsDeviceId: "default",
  selectedOutputDeviceId: "default",
};

export type MinutesTitle = {
  startTimestamp: number;
  title: string;
};

export type VBTeam = VBAccount & {
  members: Array<VBUser>;
  isDefault: boolean;
  audioDeviceSettings: AudioDeviceSettings;
  minutesTitles: Array<MinutesTitle>;
};

export type VBTeams = {
  teams: Array<VBTeam>;
  lastSpecialAction: string | undefined;
};

export type VBTeamsElectronStore = {
  state: VBTeams;
  version?: number;
};

export const createVBTeam = (
  name: string,
  isDefault: boolean = false
): VBTeam => ({
  id: uuidv4(),
  name: name,
  isDefault: isDefault,
  members: [
    {
      id: uuidv4(),
      name: "User",
    },
  ],
  audioDeviceSettings: AudioDeviceSettingsDefault,
  minutesTitles: [],
});
