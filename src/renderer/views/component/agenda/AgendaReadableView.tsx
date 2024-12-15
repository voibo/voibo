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
import { useState } from "react";
import {
  Done,
  DoneAll,
  Edit,
  PlayCircleOutline,
  RadioButtonChecked,
  StopCircle,
} from "@mui/icons-material";
import { Button } from "@mui/material";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import useClickHandler from "../common/useClickHandler.jsx";
import { Agenda, useAgendaStore } from "../../store/useAgendaStore.jsx";

export const AgendaReadableView = (props: {
  agenda: Agenda;
  setEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  isNext: boolean;
}) => {
  const { agenda, setEditMode, isNext } = props;
  const [mouseOver, setMouseOver] = useState(false);
  const agendaStore = useAgendaStore((state) => state);
  const handleClick = useClickHandler({
    onDoubleClick: () => setEditMode(true),
  });

  let stateIcon = <></>;
  switch (agenda.status) {
    case "waiting":
      stateIcon = <></>;
      break;
    case "inProgress":
      stateIcon = <RadioButtonChecked />;
      break;
    case "mayBeDone":
      stateIcon = <Done />;
      break;
    case "done":
      stateIcon = <DoneAll />;
      break;
  }

  const handleDiscussingAgenda = () => {
    if (agenda.status === "inProgress") {
      agendaStore.endDiscussion(agenda.id);
    } else {
      agendaStore.startDiscussion(agenda.id);
    }
  };

  const handleEdit = () => {
    setEditMode(true);
  };

  const isFocused = mouseOver || isNext;

  return (
    <div
      className="flex items-center bg-blue-600 rounded p-1"
      onMouseOver={() => setMouseOver(true)}
      onMouseLeave={() => setMouseOver(false)}
      onClick={handleClick}
    >
      {/* Play Button */}
      <div className={`w-10 flex flex-col items-center`}>
        {isFocused ? (
          <div className={`flex flex-grow items-center justify-center`}>
            <Button
              variant="outlined"
              className="border-none min-h-0 min-w-0 w-10 text-white"
              onClick={handleDiscussingAgenda}
            >
              {agenda.status === "inProgress" ? (
                <StopCircle sx={{ fontSize: "2.5rem" }} />
              ) : (
                <PlayCircleOutline sx={{ fontSize: "2.5rem" }} />
              )}
            </Button>
          </div>
        ) : (
          <div className="flex-grow-0">{stateIcon}</div>
        )}
      </div>

      {/* Agenda Content */}
      <div className="flex-grow flex flex-col mx-2">
        <div className="flex items-center">
          <div className="flex items-center text-lg">{agenda.title}</div>
        </div>
        {agenda.status === "inProgress" ||
          (isFocused && (
            <>
              <ReactMarkdown remarkPlugins={[remarkGfm]} className={"markdown"}>
                {agenda.detail}
              </ReactMarkdown>
              <div className="flex flex-col justify-start ">
                {agenda.classification != "all" && (
                  <div className="text-white/50 text-xs">
                    {agenda.classification}
                  </div>
                )}
                {agenda.category != "Unknown" && (
                  <div className="text-white/50 text-xs">{agenda.category}</div>
                )}
              </div>
            </>
          ))}
      </div>

      {/* Edit Button */}
      {isFocused && (
        <div className="flex justify-end items-end">
          <Button
            variant="outlined"
            className="border-none min-h-0 min-w-0 text-white"
            onClick={handleEdit}
          >
            <Edit sx={{ fontSize: "0.75rem" }} />
          </Button>
        </div>
      )}
    </div>
  );
};
