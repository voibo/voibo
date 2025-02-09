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
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AddCircle, Settings } from "@mui/icons-material";
import {
  Button,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import { IPCInvokeKeys } from "../../../common/constants.js";
import { VBAvatar } from "../component/common/VBAvatar.jsx";
import { VBSettings } from "../component/setting/VBSettings.jsx";
import { useVBMainStoreEffect } from "../store/useVBMainStore.jsx";
import { processVBAction } from "../action/VBAction.js";
import { processMinutesAction } from "../action/MinutesAction.js";
import { useVBTeamStore } from "../store/useVBTeamStore.jsx";

export const HomePage = () => {
  useVBMainStoreEffect();
  const currentTeam = useVBTeamStore((state) => state).getHydratedCurrentTeam();

  // get audio folder path
  useEffect(() => {
    window.electron.invoke(IPCInvokeKeys.GET_AUDIO_FOLDER_PATH).then((res) => {
      processVBAction({
        type: "setAudioFolder",
        payload: {
          audioFolder: res,
        },
      });
    });
  }, []);

  return (
    <div className="bg-white text-zinc-600 w-screen fixed flex flex-col">
      <HomeHeader />
      <hr />
      <VoiboBoardHeader />
      <VoiboBoard />
      {/* settings popup */}
      <VBSettings />
    </div>
  );
};

const HomeHeader = () => {
  const handleSettings = (event: any) => {
    processVBAction({
      type: "changeVBSettingsDialogOpen",
    });
  };

  return (
    <div className="flex px-6 py-4">
      <div className="flex-grow flex items-center justify-start">
        <img src="./asset/va_logo_black.svg" className="h-10 mr-8" />
        <TeamSelector />
      </div>

      <div className="flex items-center justify-end">
        <Button
          variant="text"
          className="text-zinc-600"
          onClick={handleSettings}
        >
          <Settings />
        </Button>
      </div>
    </div>
  );
};

const TeamSelector = () => {
  // team
  const teams = useVBTeamStore((state) => state).getAllTeamAccounts();

  return (
    <Select
      value={teams.length > 0 ? teams[0].id : "add"}
      onChange={() => {}}
      size="small"
      sx={{
        ".MuiOutlinedInput-notchedOutline": {
          borderColor: "rgba(0, 0, 0, 0.1)",
        },
        ".MuiSvgIcon-root ": {
          fill: "rgba(0, 0, 0, 0.3) !important",
        },
      }}
    >
      {teams.map((team, index) => {
        return (
          <MenuItem value={team.id} key={index}>
            <div className="flex items-center">
              <VBAvatar
                variant="rounded"
                name={team.name}
                avatarImage={team.avatarImage}
                className="mr-4"
              />
              <span>{team.name}</span>
            </div>
          </MenuItem>
        );
      })}
      {/*
      <MenuItem value={"add"}>
        <div className="flex items-center">Add Team</div>
      </MenuItem> 
      */}
    </Select>
  );
};

const VoiboBoardHeader = () => {
  const navigate = useNavigate();
  const handleAdd = (event: any) => {
    processMinutesAction({
      type: "createNewMinutes",
      payload: {
        navigate,
      },
    });
  };

  // team
  const team = useVBTeamStore((state) => state).getHydratedCurrentTeam();

  // user
  const user = team.members[0];
  const name = user.name;
  const avatarImage = user.avatarImage;

  return (
    <div className="p-6 pb-4 flex items-center">
      <div className="flex-auto flex items-center">
        <div className="mr-12 text-2xl">Voice Boards</div>
        <div className="flex items-center">
          <VBAvatar name={name} avatarImage={avatarImage} className="mr-4" />
          <span>{name}</span>
        </div>
      </div>
      <Button onClick={handleAdd} variant="outlined">
        <AddCircle />
        <span className="ml-2">Add</span>
      </Button>
    </div>
  );
};

const VoiboBoard = () => {
  const navigate = useNavigate();
  const storedMinutes = [
    ...useVBTeamStore((state) => state).getAllMinutesTitles(),
  ].sort((a, b) => b.startTimestamp - a.startTimestamp);

  const handleLoad = (event: any) => {
    const startTimestamp =
      event.currentTarget.closest("[data-minutes]").dataset?.minutes;
    // load
    if (startTimestamp) {
      processMinutesAction({
        type: "openMinutes",
        payload: {
          startTimestamp: Number(startTimestamp),
          navigate,
        },
      });
    }
  };
  return (
    <div className="px-6 overflow-y-auto h-[calc(100vh-8rem)]">
      <Table stickyHeader aria-label="sticky table">
        <TableHead>
          <TableRow>
            <TableCell>Title</TableCell>
            <TableCell>Created at</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {storedMinutes.map((storedMinute) => {
            return (
              <TableRow
                hover
                key={storedMinute.startTimestamp}
                data-minutes={storedMinute.startTimestamp}
                onClick={handleLoad}
                className="cursor-pointer"
              >
                <TableCell>{storedMinute.title}</TableCell>
                <TableCell>
                  {new Date(
                    Number(storedMinute.startTimestamp)
                  ).toLocaleString()}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
