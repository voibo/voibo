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
import { MoreHoriz, Send } from "@mui/icons-material";
import {
  Button,
  Dialog,
  DialogContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
} from "@mui/material";
import { Dispatch, useState } from "react";
import {
  AssistantAction,
  AssistantState,
  makeTopicOrientedInvokeParam,
} from "../../store/useAssistantsStore.jsx";
import { useVBStore } from "../../store/useVBStore.js";
import { useMinutesStore } from "../../store/useMinutesStore.jsx";

// requestor
export type TypicalRequestType =
  | "MindMap"
  | "Ideation"
  | "Facilitate"
  | "Summarize";
export type TypicalRequest = {
  type: TypicalRequestType;
  label: string;
  value: string;
};

export const VirtualAssistantRequester = (props: {
  state: AssistantState;
  dispatch: Dispatch<AssistantAction>;
}) => {
  const { state, dispatch } = props;
  const startTimestamp = useVBStore((state) => state.startTimestamp);
  const minutesStore = useMinutesStore(startTimestamp);
  const isSomeSelected = minutesStore((state) => state.topics).some(
    (topic) => topic.selected ?? false
  );

  // typical request
  const [typicalRequest, setTypicalRequest] = useState<number>(0);
  const typicalRequests: TypicalRequest[] = [
    {
      type: "MindMap",
      label: "マインドマップ作成",
      value: "内容をマインドマップにまとめよ。",
    },
    {
      type: "Ideation",
      label: "アイデア出し",
      value:
        "内容をもとにアイデアを生成せよ。各アイデイアは具体的かつ、簡潔に記述せよ。",
    },
    {
      type: "Facilitate",
      label: "ファシリテート",
      value: "内容をもとにファシリテーションを行うこと。",
    },
  ];
  const handleChangeSelect = (event: SelectChangeEvent) => {
    setTypicalRequest(Number(event.target.value));
  };

  // send prompt
  const handleSendPromptBase = (index: number) => {
    dispatch({
      type: "invokeAssistant",
      payload: {
        queue: [
          makeTopicOrientedInvokeParam({
            basePrompt: typicalRequests[index].value,
            topics: minutesStore((state) => state.topics).filter(
              (topic) => topic.selected
            ),
            attachOption: {
              attachment: "topic",
              target: "manualSelected",
            },
            customField: {
              attachment: "topic",
              type: typicalRequests[index].type,
              label: typicalRequests[index].label,
            },
          }),
        ],
      },
    });
  };
  const handleSendPrompt = () => {
    handleSendPromptBase(typicalRequest);
    setOpen(false);
  };

  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col rounded w-ful bg-blue-300 space-y-2">
      <div className="flex flex-row items-center rounded m-1">
        <div className="flex flex-row items-center text-sm space-x-1 flex-grow px-2 py-3 overflow-hidden">
          {typicalRequests.slice(0, 4).map((value, index) => (
            <Button
              key={index}
              disabled={!isSomeSelected || state.onProcess}
              className="border rounded-full p-2  bg-white whitespace-nowrap overflow-hidden"
              variant="outlined"
              onClick={() => handleSendPromptBase(index)}
            >
              {value.label}
            </Button>
          ))}
        </div>
        <Button
          className="min-w-0 min-h-0 fle"
          disabled={!isSomeSelected || state.onProcess}
          onClick={() => setOpen(true)}
        >
          <MoreHoriz />
        </Button>
        <Dialog disableEscapeKeyDown open={open} onClose={() => setOpen(false)}>
          <DialogContent>
            <div className="flex flex-row">
              <FormControl fullWidth>
                <InputLabel>Typical Request</InputLabel>
                <Select
                  label="Typical Request"
                  value={String(typicalRequest)}
                  onChange={handleChangeSelect}
                >
                  {typicalRequests.map((request, index) => {
                    return (
                      <MenuItem key={index} value={index}>
                        {request.label}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                className="min-w-0"
                disabled={!isSomeSelected}
                onClick={handleSendPrompt}
              >
                <Send />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
