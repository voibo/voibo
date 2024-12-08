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
import { AddCircle, Settings, WorkHistory } from "@mui/icons-material";
import {
  Divider,
  Drawer,
  ListItemIcon,
  ListItemText,
  MenuItem,
  MenuList,
} from "@mui/material";
import { Dispatch, useEffect, useState } from "react";
import { useIndexedDB } from "react-indexed-db-hook";
import { TopicSchema } from "../../main/agent/agentManagerDefinition.js";
import { drawerWidth } from "./VFPage.jsx";
import { DB_MINUTES, Minutes, MinutesRecord } from "./db/DBConfig.jsx";
import {
  GeneralAssistantConf,
  VFAction,
  VFState,
} from "./store/useVFStore.jsx";
import { useMinutesTitleStore } from "./store/useMinutesTitle.jsx";

export const MainMenuComponent = (props: {
  vfState: VFState;
  vfDispatch: Dispatch<VFAction>;
}) => {
  const { vfState, vfDispatch } = props;
  const minutesDB = useIndexedDB(DB_MINUTES);

  const handleLoad = (event: any) => {
    const loadTargetSavedMinutes =
      event.currentTarget.closest("[data-minutes]").dataset?.minutes;
    const loadTargetTitle =
      event.currentTarget.closest("[data-title]").dataset?.title;
    // load
    if (loadTargetSavedMinutes && loadTargetTitle) {
      minutesDB
        .getByID<MinutesRecord>(Number(loadTargetSavedMinutes))
        .then((record) => {
          if (record) {
            const data = JSON.parse(record.json) as Minutes;
            console.log("load minutes from IDB:", data, loadTargetTitle);
            vfDispatch({
              type: "openMinutes",
              payload: {
                title: loadTargetTitle,
                startTimestamp: Number(data.startTimestamp),
                segments: data.segments ?? new Map(),
                minutes: data.minutes ?? [],
                topics: data.topics ?? [],
                assistants: data.assistants ?? [GeneralAssistantConf],
                topicAIConf: {
                  ...data.topicAIConf, // 過去にstructuredOutputSchemaがないものを考慮
                  structuredOutputSchema:
                    data.topicAIConf.structuredOutputSchema ?? TopicSchema,
                },
              },
            });
          }
        })
        .catch((error: Error) => {
          console.log(error);
        });
    }
  };

  const storedMinutes = useMinutesTitleStore((state) => state)
    .getAllMinutesTitles()
    .sort();

  return (
    <Drawer
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
        },
      }}
      variant="persistent"
      anchor="left"
      open={vfState.mainMenuOpen}
    >
      <div className="overflow-hidden">
        <div className="p-2 w-full flex items-center">
          <img
            src="./asset/va_logo_black.svg"
            className="h-10 object-contain flex-grow"
          />
        </div>
        <Divider />
        <MenuItem
          onClick={() => {
            vfDispatch({
              type: "createNewMinutes",
            });
          }}
          className="py-4"
        >
          <ListItemIcon>
            <AddCircle fontSize="small" />
          </ListItemIcon>
          <ListItemText>Add new</ListItemText>
        </MenuItem>
        <hr />
        <MenuItem disabled>
          <ListItemIcon>
            <WorkHistory fontSize="small" />
          </ListItemIcon>
          <ListItemText>History</ListItemText>
        </MenuItem>
      </div>
      <div className="overflow-y-auto h-[calc(100vh-12rem)]">
        <MenuList>
          {storedMinutes.map((storedMinute) => {
            return (
              <MenuItem
                key={storedMinute.startTimestamp}
                data-minutes={storedMinute.startTimestamp}
                data-title={storedMinute.title}
                onClick={handleLoad}
              >
                <div className="flex flex-col pl-4 py-1">
                  <div>{storedMinute.title}</div>
                  <div className="text-xs text-zinc-400">
                    {new Date(
                      Number(storedMinute.startTimestamp)
                    ).toLocaleString()}
                  </div>
                </div>
              </MenuItem>
            );
          })}
        </MenuList>
        <div
          className={`fixed bottom-0 bg-white`}
          style={{ width: `${drawerWidth - 1}px` }}
        >
          <Divider />
          <MenuItem
            onClick={() => {
              vfDispatch({
                type: "changeVADDialogOpen",
              });
            }}
            className="py-4"
          >
            <ListItemIcon>
              <Settings fontSize="small" />
            </ListItemIcon>
            <ListItemText>Setting</ListItemText>
          </MenuItem>
        </div>
      </div>
    </Drawer>
  );
};
