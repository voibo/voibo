/*
Copyright 2024 SpiralMind Co., Ltd. & Humanest Ltd. & Spiral Effect

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
import { Add, Edit, SmartToyOutlined } from "@mui/icons-material";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import { MouseEventHandler, useReducer } from "react";
import { v4 as uuidv4 } from "uuid";
import { GENERAL_ASSISTANT_NAME } from "../../../main/agent/agentManagerDefinition.js";
import { VirtualAssistantConf } from "../store/useAssistantsStore.jsx";
import { useVFStore } from "../store/useVFStore.jsx";
import {
  VirtualAssistantConfDialog,
  VirtualAssistantConfDialogMode,
} from "./VirtualAssistantConfDialog.jsx";
import { AIAssistantAvatar } from "./message/AIAssistantAvatar.jsx";

function createCommonAssistantConfTemple(): VirtualAssistantConf {
  return {
    assistantType: "va-custom",
    aiConfig: {
      systemPrompt: "",
      modelType: "gemini-1.5-flash",
      temperature: 1,
    },
    assistantId: uuidv4(),
    assistantName: "facilitator",
    icon: "./asset/cat_robo_iconL.svg",
    label: "Checking Assistant",
    updateMode: "at_agenda_completed",
    messageViewMode: "latest_response",
    attachOption: {
      attachment: "topic",
      target: "systemFiltered",
    },
    initialPrompt: "会話からキーワードだけを検出し、列挙せよ。",
    updatePrompt: "以下が最新の会話内容である。:",
  };
}

export type AssistantConfigState = {
  dialogMode: VirtualAssistantConfDialogMode;
  dialogOpen: boolean;
  assistantConfig: VirtualAssistantConf | undefined;
};

export type AssistantConfigAction =
  | {
    type: "open";
    payload: {
      assistantConfig: VirtualAssistantConf;
      mode: VirtualAssistantConfDialogMode;
    };
  }
  | {
    type: "close";
  };

export const VirtualAssistantManager = (props: { handleClose: () => void }) => {
  const { handleClose } = props;
  /**
   * General Assistant を除くすべての Assistant を管理する
   */
  const vfState = useVFStore((state) => state);
  const vfDispatch = useVFStore((state) => state.vfDispatch);

  // VA conf dialog
  const [dialogState, dialogDispatch] = useReducer(
    (state: AssistantConfigState, action: AssistantConfigAction) => {
      switch (action.type) {
        case "open":
          return {
            dialogMode: action.payload.mode,
            dialogOpen: true,
            assistantConfig: action.payload.assistantConfig,
          };
        case "close":
          return {
            dialogMode: "create" as VirtualAssistantConfDialogMode,
            dialogOpen: false,
            assistantConfig: undefined,
          };
      }
    },
    {
      dialogMode: "create" as VirtualAssistantConfDialogMode,
      dialogOpen: false,
      assistantConfig: undefined,
    }
  );

  const handleVAConfDialog: MouseEventHandler<HTMLButtonElement> = (event) => {
    const assistantId = event.currentTarget.value;
    const assistantConfig = vfState.assistants.find((assistantConfig) => {
      return assistantConfig.assistantId === assistantId;
    });
    if (!assistantConfig) return;
    dialogDispatch({
      type: "open",
      payload: {
        assistantConfig: assistantConfig,
        mode: "edit",
      },
    });
  };

  const avatarIconStyle = { width: "1.5rem", height: "1.5rem" };
  const assistants = vfState.assistants.filter(
    (assistant) => assistant.assistantId !== GENERAL_ASSISTANT_NAME
  );

  // bg-blue-400
  return (
    <div className="rounded p-4 flex flex-col items-center bg-indigo-950 text-white">
      <div className="w-full flex items-center justify-start">
        <div className="flex items-center justify-center">
          <SmartToyOutlined className="mr-2" />
          <div className="text-2xl">Assistant</div>
        </div>
        <div className="ml-auto">
          {assistants.length < 4 && (
            <Button
              variant="outlined"
              className="text-white border-white"
              onClick={() => {
                dialogDispatch({
                  type: "open",
                  payload: {
                    assistantConfig: createCommonAssistantConfTemple(),
                    mode: "create",
                  },
                });
              }}
            >
              <Add sx={avatarIconStyle} className="mr-2" /> Add
            </Button>
          )}
        </div>
      </div>
      <div className="w-full overflow-auto">
        <Table className="bg-white rounded mt-4">
          <TableHead>
            <TableRow>
              <TableCell></TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Mode</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Classification</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {assistants.map((assistantConfig, index) => (
              <TableRow key={assistantConfig.assistantId}>
                <TableCell>
                  <AIAssistantAvatar
                    label={assistantConfig.label}
                    icon={assistantConfig.icon}
                  //sx={avatarIconStyle}
                  />
                </TableCell>
                <TableCell>{assistantConfig.label}</TableCell>
                <TableCell>{assistantConfig.updateMode}</TableCell>
                <TableCell>{assistantConfig.targetCategory}</TableCell>
                <TableCell>{assistantConfig.targetClassification}</TableCell>
                <TableCell>
                  <Button
                    value={assistantConfig.assistantId}
                    key={index}
                    className="min-w-0 min-h-0 border-0"
                    onClick={handleVAConfDialog}
                  >
                    <Edit sx={{ fontSize: "1rem" }} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <VirtualAssistantConfDialog
        vfState={vfState}
        vfDispatch={vfDispatch}
        dialogState={dialogState}
        dialogDispatch={dialogDispatch}
      />
    </div>
  );
};
