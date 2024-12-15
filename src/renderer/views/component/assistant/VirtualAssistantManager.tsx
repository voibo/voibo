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
import { MouseEventHandler, ReactNode, useReducer, useState } from "react";
import { Add, Edit, SmartToyOutlined } from "@mui/icons-material";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import { v4 as uuidv4 } from "uuid";
import { GENERAL_ASSISTANT_NAME } from "../../../../common/content/assisatant.js";
import {
  VirtualAssistantConfDialog,
  VirtualAssistantConfDialogMode,
} from "./VirtualAssistantConfDialog.jsx";
import { AIAssistantAvatar } from "./message/AIAssistantAvatar.jsx";
import { AssistantTemplateDialog } from "./AssistantTemplateDialog.jsx";
import { useMinutesStore } from "../../store/useMinutesStore.jsx";
import { VirtualAssistantConf } from "../../store/useAssistantsStore.jsx";
import { useVBStore } from "../../store/useVBStore.jsx";

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
  const startTimestamp = useVBStore((state) => state.startTimestamp);
  const minutesStore = useMinutesStore(startTimestamp);

  // VA conf dialog
  const [vaConfDialogState, vaConfDialogDispatch] = useReducer(
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

  const handleEditVAConf: MouseEventHandler<HTMLButtonElement> = (event) => {
    const assistantId = event.currentTarget.value;
    const assistantConfig = minutesStore((state) => state.assistants).find(
      (assistantConfig) => {
        return assistantConfig.assistantId === assistantId;
      }
    );
    if (!assistantConfig) return;
    console.log("handleEditVAConf", assistantConfig);
    vaConfDialogDispatch({
      type: "open",
      payload: {
        assistantConfig: assistantConfig,
        mode: "edit",
      },
    });
  };

  const handleAddAssistantDialog: MouseEventHandler<HTMLButtonElement> = (
    event
  ) => {
    vaConfDialogDispatch({
      type: "open",
      payload: {
        assistantConfig: createCommonAssistantConfTemple(),
        mode: "create",
      },
    });
  };

  // Assistant Template Dialog
  const [assistantTemplateDialogOpen, setAssistantTemplateDialogOpen] =
    useState(false);
  const handleAssistantTemplateDialog: MouseEventHandler<HTMLButtonElement> = (
    event
  ) => {
    setAssistantTemplateDialogOpen(true);
  };

  const avatarIconStyle = { width: "1.5rem", height: "1.5rem" };
  const assistants = minutesStore((state) => state.assistants).filter(
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
          {assistants.length < 10 && (
            <>
              <Button
                variant="outlined"
                className="text-white border-white mr-2"
                onClick={handleAssistantTemplateDialog}
              >
                <Add sx={avatarIconStyle} className="mr-2" /> Select
              </Button>
              <Button
                variant="outlined"
                className="text-white border-white"
                onClick={handleAddAssistantDialog}
              >
                <Add sx={avatarIconStyle} className="mr-2" /> Create
              </Button>
            </>
          )}
        </div>
      </div>
      <div className="w-full overflow-auto">
        <Table className="bg-white rounded mt-4">
          <TableHead>
            <TableRow>
              <TableCell></TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Target</TableCell>
              <TableCell>Agent</TableCell>
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
                <TableCell>
                  <TargetLabel assistantConf={assistantConfig} />
                </TableCell>
                <TableCell>Agent</TableCell>
                <TableCell>
                  <Button
                    value={assistantConfig.assistantId}
                    key={index}
                    className="min-w-0 min-h-0 border-0"
                    onClick={handleEditVAConf}
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
        dialogState={vaConfDialogState}
        dialogDispatch={vaConfDialogDispatch}
      />

      <AssistantTemplateDialog
        open={assistantTemplateDialogOpen}
        closeDialog={setAssistantTemplateDialogOpen}
      />
    </div>
  );
};

export const TargetLabel = (props: { assistantConf: VirtualAssistantConf }) => {
  const { assistantConf } = props;

  let categoryLabel: ReactNode | undefined =
    assistantConf.targetCategory !== "Unknown"
      ? assistantConf.targetCategory
      : undefined;
  let classificationLabel: ReactNode | undefined =
    assistantConf.targetClassification !== "all"
      ? assistantConf.targetClassification
      : undefined;

  let triggerTargetLabel: ReactNode | undefined = undefined;
  let triggerActLabel: ReactNode = "";
  switch (assistantConf.updateMode) {
    case "at_agenda_completed":
      triggerTargetLabel = "Agenda";
      triggerActLabel = "Completed";
      break;
    case "at_agenda_updated":
      triggerTargetLabel = "Agenda";
      triggerActLabel = "Updated";
      break;
    case "at_topic_updated":
      triggerTargetLabel = "Topic";
      triggerActLabel = "Updated";
      break;
    case "manual":
      triggerTargetLabel = undefined;
      triggerActLabel = "Manual";
      break;
  }
  return (
    <div className="rounded-full bg-black/5 py-1 px-1 flex items-center justify-center">
      {triggerTargetLabel && (
        <div className="rounded-full bg-black/5 py-1 px-1 flex items-center justify-center">
          <div className="mx-2">{triggerTargetLabel}</div>
          {(categoryLabel || classificationLabel) && (
            <div className="rounded-full bg-black/5 py-1 px-4 text-[0.65rem]">
              {categoryLabel}
              {categoryLabel && classificationLabel && " & "}
              {classificationLabel}
            </div>
          )}
        </div>
      )}
      <div className="mx-2">{triggerActLabel}</div>
    </div>
  );
};
