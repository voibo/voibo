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
  subscribeWithSelector,
  persist,
  PersistStorage,
  StorageValue,
} from "zustand/middleware";
import { produce } from "immer";
import { HydrateState } from "./IDBKeyValPersistStorage.jsx";
import { formatTimestamp } from "../../util.js";
import {
  AudioDeviceSettings,
  createVBTeam,
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
    console.log("VBTeamsPersistStorage: setItem", value);
    await window.electron.invoke(IPCInvokeKeys.SET_TEAMS, value);
  },
  removeItem: async (name: string): Promise<void> => {
    console.error("VBTeamsPersistStorage: removeItem is called", name);
  },
};

export type VBTeamsAction = {
  // Team core
  setTeamToLaunch: (teamId: string) => void; // set the team to launch

  addTeam: () => void;
  getHydratedCurrentTeam: () => VBTeam;
  getTeam: (teamId: string) => VBTeam | undefined;
  getAllTeamAccounts: () => VBAccount[];
  removeTeam: (teamId: string) => void;

  // team
  updateTeamConf: (payload: Partial<VBUser>) => void;

  // member
  addTeamMember: (member: VBUser) => void;
  updateTeamMember: (member: VBUser) => void;
  removeTeamMember: (userId: string) => void;

  // audio device settings
  setAudioDeviceSettings: (payload: Partial<AudioDeviceSettings>) => void;

  // MinutesTitle
  setMinutesTitle: (minutesTitle: MinutesTitle) => void;
  setDefaultMinutesTitle: (startTimestamp: number) => void;
  removeMinutesTitle: (startTimestamp: number) => void;
  getMinutesTitle: (startTimestamp: number) => string | undefined;
  getAllMinutesTitles: () => MinutesTitle[];

  // util
  // this is used to notify the special action to update the store in the main process.
  noticeSpecialActionToMain: (action?: string) => void;
};

export const useVBTeamStore = create<VBTeams & VBTeamsAction & HydrateState>()(
  persist(
    subscribeWithSelector((set, get, api) => ({
      teams: [],
      lastSpecialAction: undefined,

      // util
      noticeSpecialActionToMain: (action) => {
        if (get().lastSpecialAction !== action) {
          set({ lastSpecialAction: action });
        }
      },

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
      addTeam: () => {
        set(
          produce((state: VBTeams) => {
            const newTeam = createVBTeam("New Team", false);
            state.teams.push(newTeam);
            get().noticeSpecialActionToMain("addTeam");
          })
        );
      },

      getAllTeamAccounts: () => {
        if (!get().hasHydrated) return [];
        get().noticeSpecialActionToMain();
        return get().teams.map((team) => ({
          id: team.id,
          name: team.name,
          avatarImage: team.avatarImage,
        }));
      },
      getTeam: (teamId) => {
        if (!get().hasHydrated) return;
        get().noticeSpecialActionToMain();
        return get().teams.find((team) => team.id === teamId);
      },
      getHydratedCurrentTeam: () => {
        // this function is required to be called after hydration
        const team = get().teams.find((team) => team.isDefault === true);
        if (team) return team;
        // expect the first team to be the default team
        get().noticeSpecialActionToMain();
        return team ? team : get().teams[0];
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
              get().noticeSpecialActionToMain("removeTeam");
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
            get().noticeSpecialActionToMain("setTeamToLaunch");
          })
        );
      },

      // MinutesTitleAction
      setMinutesTitle: (minutesTitle) => {
        set(
          produce((state: VBTeams & VBTeamsAction) => {
            const team = state.getHydratedCurrentTeam();
            if (!team) return;

            const mutableTeam = {
              ...team,
              minutesTitles: [...team.minutesTitles],
            };

            const existingIndex = mutableTeam.minutesTitles.findIndex(
              (value) => value.startTimestamp === minutesTitle.startTimestamp
            );

            if (existingIndex !== -1) {
              mutableTeam.minutesTitles[existingIndex] = minutesTitle;
            } else {
              mutableTeam.minutesTitles.push(minutesTitle);
            }

            const teamIndex = state.teams.findIndex((t) => t.id === team.id);
            if (teamIndex !== -1) {
              state.teams[teamIndex] = mutableTeam;
              get().noticeSpecialActionToMain("setMinutesTitle");
            }
          })
        );
      },
      setDefaultMinutesTitle: (startTimestamp) => {
        get().setMinutesTitle({
          startTimestamp,
          title: makeDefaultTitle(startTimestamp),
        });
        get().noticeSpecialActionToMain("setDefaultMinutesTitle");
      },
      removeMinutesTitle: (startTimestamp: number) => {
        set(
          produce((state: VBTeams & VBTeamsAction) => {
            const team = state.getHydratedCurrentTeam();
            if (!team) return;

            const mutableTeam = {
              ...team,
              minutesTitles: [...team.minutesTitles],
            };

            const index = mutableTeam.minutesTitles.findIndex(
              (value) => value.startTimestamp === startTimestamp
            );
            if (index !== -1) {
              mutableTeam.minutesTitles.splice(index, 1);
            }

            const teamIndex = state.teams.findIndex((t) => t.id === team.id);
            if (teamIndex !== -1) {
              state.teams[teamIndex] = mutableTeam;
              get().noticeSpecialActionToMain("removeMinutesTitle");
            }
          })
        );
      },
      getMinutesTitle: (startTimestamp) => {
        get().noticeSpecialActionToMain();
        return get()
          .getHydratedCurrentTeam()
          ?.minutesTitles.find(
            (value) => value.startTimestamp === startTimestamp
          )?.title;
      },
      getAllMinutesTitles: () => {
        get().noticeSpecialActionToMain();
        return get().getHydratedCurrentTeam()?.minutesTitles ?? [];
      },

      setAudioDeviceSettings: (payload) => {
        if (!get().hasHydrated) return;
        set(
          produce((state: VBTeams & VBTeamsAction) => {
            const team = state.getHydratedCurrentTeam();
            if (!team) return;

            const mutableTeam = {
              ...team,
            };

            mutableTeam.audioDeviceSettings = {
              ...team.audioDeviceSettings,
              ...payload,
            };

            const teamIndex = state.teams.findIndex((t) => t.id === team.id);
            if (teamIndex !== -1) {
              state.teams[teamIndex] = mutableTeam;
              get().noticeSpecialActionToMain("setAudioDeviceSettings");
            }
          })
        );
      },

      // team
      updateTeamConf: (payload) => {
        if (!get().hasHydrated) return;
        set(
          produce((state: VBTeams & VBTeamsAction) => {
            const team = state.getHydratedCurrentTeam();
            if (!team) return;

            const mutableTeam = {
              ...team,
              minutesTitles: [...team.minutesTitles],
            };

            // update the target member's user conf
            mutableTeam.name = payload.name ?? team.name;
            mutableTeam.avatarImage = payload.avatarImage ?? team.avatarImage;

            const teamIndex = state.teams.findIndex((t) => t.id === team.id);
            if (teamIndex !== -1) {
              state.teams[teamIndex] = mutableTeam;
              get().noticeSpecialActionToMain("updateTeamConf");
            }
          })
        );
      },

      // member

      addTeamMember: (member) => {
        if (!get().hasHydrated) return;
        set(
          produce((state: VBTeams & VBTeamsAction) => {
            const team = state.getHydratedCurrentTeam();
            if (!team) return;

            const mutableTeam = {
              ...team,
              members: [...team.members],
            };

            mutableTeam.members.push(member);

            const teamIndex = state.teams.findIndex((t) => t.id === team.id);
            if (teamIndex !== -1) {
              state.teams[teamIndex] = mutableTeam;
              get().noticeSpecialActionToMain("addTeamMember");
            }
          })
        );
      },

      updateTeamMember: (member) => {
        if (!get().hasHydrated) return;
        set(
          produce((state: VBTeams & VBTeamsAction) => {
            const team = state.getHydratedCurrentTeam();
            if (!team) return;

            const mutableTeam = {
              ...team,
              members: [...team.members],
            };

            mutableTeam.members = team.members.map((m) =>
              m.id === member.id ? member : m
            );

            const teamIndex = state.teams.findIndex((t) => t.id === team.id);
            if (teamIndex !== -1) {
              state.teams[teamIndex] = mutableTeam;
              get().noticeSpecialActionToMain("updateTeamMember");
            }
          })
        );
      },

      removeTeamMember: (userId) => {
        if (!get().hasHydrated) return;
        set(
          produce((state: VBTeams & VBTeamsAction) => {
            const team = state.getHydratedCurrentTeam();
            if (!team) return;

            const mutableTeam = {
              ...team,
              members: [...team.members],
            };

            mutableTeam.members = team.members.filter(
              (member) => member.id !== userId
            );

            const teamIndex = state.teams.findIndex((t) => t.id === team.id);
            if (teamIndex !== -1) {
              state.teams[teamIndex] = mutableTeam;
              get().noticeSpecialActionToMain("removeTeamMember");
            }
          })
        );
      },
    })),
    {
      name: "teams",
      storage: VBTeamsPersistStorage,
      partialize: (state) => ({
        teams: state.teams,
        lastSpecialAction: state.lastSpecialAction,
      }),
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
