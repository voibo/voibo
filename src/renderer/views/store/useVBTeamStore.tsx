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
import { create } from "zustand";
import {
  subscribeWithSelector,
  persist,
  createJSONStorage,
  StateStorage,
  PersistStorage,
  StorageValue,
} from "zustand/middleware";
import { produce } from "immer";
import { ExpandJSONOptions, HydrateState } from "./IDBKeyValPersistStorage.jsx";
import { formatTimestamp } from "../../util.js";
import {
  AudioDeviceSettings,
  MinutesTitle,
  VBAccount,
  VBTeam,
  VBTeams,
  VBUser,
} from "../../../common/teams.js";
import { IPCInvokeKeys } from "../../../common/constants.js";

const VBTeamsPersistStorage: PersistStorage<VBTeams> = {
  getItem: async (name: string): Promise<StorageValue<VBTeams> | null> => {
    return (await window.electron.invoke(IPCInvokeKeys.GET_TEAMS)) || null;
  },
  setItem: async (
    name: string,
    value: StorageValue<VBTeams>
  ): Promise<void> => {
    await window.electron.invoke(IPCInvokeKeys.SET_TEAMS, value);
  },
  removeItem: async (name: string): Promise<void> => {
    console.error("VBTeamsPersistStorage: removeItem is called", name);
  },
};

export type VBTeamsAction = {
  // Team core
  setTeamToLaunch: (teamId: string) => void; // set the team to launch

  createNewTeam: () => void;
  getTeam: (teamId: string) => VBTeam | undefined;
  getAllTeamAccounts: () => VBAccount[];
  removeTeam: (teamId: string) => void;

  // user
  updateUserConf: (teamId: string, payload: Partial<VBUser>) => void;

  // member
  addTeamMember: (teamId: string, member: VBUser) => void;
  removeTeamMember: (teamId: string, userId: string) => void;

  // audio device settings
  setAudioDeviceSettings: (
    teamId: string,
    payload: Partial<AudioDeviceSettings>
  ) => void;

  // MinutesTitle
  setMinutesTitle: (teamId: string, minutesTitle: MinutesTitle) => void;
  setDefaultMinutesTitle: (teamId: string, startTimestamp: number) => void;
  removeMinutesTitle: (teamId: string, startTimestamp: number) => void;
  getMinutesTitle: (
    teamId: string,
    startTimestamp: number
  ) => string | undefined;
  getAllMinutesTitles: (teamId: string) => MinutesTitle[];
};

export const useVBTeamStore = create<VBTeams & VBTeamsAction & HydrateState>()(
  persist(
    subscribeWithSelector((set, get, api) => ({
      teams: [],

      // Hydration
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

      // TeamCoreAction
      createNewTeam: () => {
        /*
        set(
          produce((state: VBTeams) => {
            const newTeam: VBTeam = {
              id: uuidv4(),
              name: "New Team",
              isDefault: false,
              members: [
                {
                  id: uuidv4(),
                  name: "User",
                },
              ],
              audioDeviceSettings: AudioDeviceSettingsDefault,
              minutesTitles: [],
            };
            state.teams.push(newTeam);
          })
        );
        */
        // window.electron.invoke(IPCInvokeKeys.CREATE_TEAM);
      },

      getAllTeamAccounts: () => {
        if (!get().hasHydrated) return [];
        console.log("getAllTeamAccounts", get().teams);
        return get().teams.map((team) => ({
          id: team.id,
          name: team.name,
          avatarImage: team.avatarImage,
        }));
      },
      getTeam: (teamId) => {
        if (!get().hasHydrated) return;
        return get().teams.find((team) => team.id === teamId);
      },
      removeTeam: (teamId) => {
        if (!get().hasHydrated) return;
        set(
          produce((state: VBTeams & VBTeamsAction) => {
            const team = state.getTeam(teamId);
            if (!team) return;
            const index = state.teams.findIndex((value) => value.id === teamId);
            if (index !== -1) {
              state.teams.splice(index, 1);
            }
          })
        );
      },

      setTeamToLaunch: (teamId) => {
        if (!get().hasHydrated) return;
        set(
          produce((state: VBTeams) => {
            state.teams.forEach((team) => {
              team.isDefault = team.id === teamId;
            });
          })
        );
      },

      // MinutesTitleAction
      setMinutesTitle: (teamId, minutesTitle) => {
        set(
          produce((state: VBTeams & VBTeamsAction) => {
            const team = state.getTeam(teamId);
            if (!team) return;
            const index = team.minutesTitles.findIndex(
              (value) => value.startTimestamp === minutesTitle.startTimestamp
            );
            if (index !== -1) {
              team.minutesTitles[index] = minutesTitle;
            } else {
              team.minutesTitles.push(minutesTitle);
            }
          })
        );
      },
      setDefaultMinutesTitle: (teamId, startTimestamp) => {
        get().setMinutesTitle(teamId, {
          startTimestamp,
          title: makeDefaultTitle(startTimestamp),
        });
      },
      removeMinutesTitle: (teamId: string, startTimestamp: number) => {
        set(
          produce((state: VBTeams & VBTeamsAction) => {
            const team = state.getTeam(teamId);
            if (!team) return;
            const index = team.minutesTitles.findIndex(
              (value) => value.startTimestamp === startTimestamp
            );
            if (index !== -1) {
              team.minutesTitles.splice(index, 1);
            }
          })
        );
      },
      getMinutesTitle: (teamId, startTimestamp) => {
        return get()
          .getTeam(teamId)
          ?.minutesTitles.find(
            (value) => value.startTimestamp === startTimestamp
          )?.title;
      },
      getAllMinutesTitles: (teamId) => {
        return get().getTeam(teamId)?.minutesTitles ?? [];
      },

      setAudioDeviceSettings: (teamId, payload) => {
        if (!get().hasHydrated) return;
        set(
          produce((state: VBTeams & VBTeamsAction) => {
            const team = state.getTeam(teamId);
            if (!team) return;
            team.audioDeviceSettings = {
              ...team.audioDeviceSettings,
              ...payload,
            };
          })
        );
      },

      updateUserConf: (teamId, payload) => {
        if (!get().hasHydrated) return;
        set(
          produce((state: VBTeams & VBTeamsAction) => {
            const team = state.getTeam(teamId);
            if (!team) return;
            team.name = payload.name ?? team.name;
            team.avatarImage = payload.avatarImage ?? team.avatarImage;
          })
        );
      },

      addTeamMember: (teamId, member) => {
        if (!get().hasHydrated) return;
        set(
          produce((state: VBTeams & VBTeamsAction) => {
            const team = state.getTeam(teamId);
            if (!team) return;
            team.members.push(member);
          })
        );
      },

      removeTeamMember: (teamId, userId) => {
        if (!get().hasHydrated) return;
        set(
          produce((state: VBTeams & VBTeamsAction) => {
            const team = state.getTeam(teamId);
            if (!team) return;
            team.members = team.members.filter(
              (member) => member.id !== userId
            );
          })
        );
      },
    })),
    {
      name: "teams",
      storage: VBTeamsPersistStorage,
      partialize: (state) => ({ teams: state.teams }),
      onRehydrateStorage: (state) => {
        return (state, error) => {
          if (error) {
            console.error(
              "useTeamStore: An error happened during hydration",
              error
            );
          } else if (state) {
            state.setHasHydrated(true);
            console.log("useTeamStore: rehydrated", state);
          }
        };
      },
    }
  )
);

export function makeDefaultTitle(startTimestamp: number): string {
  return `MTG: ${formatTimestamp(startTimestamp)}`;
}
