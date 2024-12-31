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
import { AddCircle } from "@mui/icons-material";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import { IPCInvokeKeys } from "../../../common/constants.js";
import { UserAvatar } from "../component/common/UserAvatar.jsx";
import { VBSettings } from "../component/setting/VBSettings.jsx";
import { useVBMainStoreEffect } from "../store/useVBMainStore.jsx";
import { useMinutesTitleStore } from "../store/useMinutesTitleStore.jsx";
import { useVBSettingsStore } from "../store/useVBSettingStore.jsx";
import { processVBAction } from "../action/VBAction.js";
import { processMinutesAction } from "../action/MinutesAction.js";

export const HomePage = () => {
  useVBMainStoreEffect();

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
  const name = useVBSettingsStore((state) => state.name);
  const avatarImage = useVBSettingsStore((state) => state.avatarImage);
  const handleSettings = (event: any) => {
    processVBAction({
      type: "changeVBSettingsDialogOpen",
    });
  };

  return (
    <div className="flex px-6 py-4">
      <div className="flex-grow flex items-center justify-start">
        <img src="./asset/va_logo_black.svg" className="h-10" />
      </div>
      <div className="flex items-center justify-end">
        <Button
          variant="text"
          className="text-zinc-600"
          onClick={handleSettings}
        >
          <UserAvatar name={name} avatarImage={avatarImage} />
        </Button>
      </div>
    </div>
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
  return (
    <div className="p-6 pb-0 flex items-center">
      <div className="flex-auto text-2xl flex items-center">
        <span>Your Voice Boards</span>
      </div>
      <Button onClick={handleAdd} variant="outlined">
        <AddCircle />
        <span className="ml-2">Add new</span>
      </Button>
    </div>
  );
};

const VoiboBoard = () => {
  const navigate = useNavigate();
  const storedMinutes = useMinutesTitleStore((state) => state)
    .getAllMinutesTitles()
    .sort((a, b) => b.startTimestamp - a.startTimestamp);

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
