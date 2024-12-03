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
import { useVFStore } from "../store/useVFStore.jsx";
import { VirtualAssistantConf } from "../store/useAssistantsStore.jsx";
import {
  Button,
  Dialog,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import { Dispatch, SetStateAction } from "react";
import { Add, SmartToyOutlined } from "@mui/icons-material";
import { AIAssistantAvatar } from "./message/AIAssistantAvatar.jsx";
import { v4 as uuidv4 } from "uuid";
import { AssistantTemplates } from "./AssistantTemplates.js";

export const AssistantTemplateDialog = (props: {
  open: boolean;
  closeDialog: Dispatch<SetStateAction<boolean>>;
}) => {
  const { open, closeDialog } = props;
  const vfStore = useVFStore.getState();
  const minutesStartTimestamp = vfStore.startTimestamp;
  if (!minutesStartTimestamp) return <></>;

  // handle close dialog
  const handleClose = () => {
    closeDialog(false);
  };

  // template assistants
  const templates = AssistantTemplates;

  const handleAddTemplate = (templateId: string) => (event: any) => {
    const template = templates.find(
      (template) => template.templateId === templateId
    );
    if (!template) return;
    const newAssistantConf: VirtualAssistantConf = {
      ...template.config,
      assistantId: uuidv4(),
    };

    console.log("handleAddTemplate", newAssistantConf);
    vfStore.vfDispatch({
      type: "addVirtualAssistantConf",
      payload: {
        assistant: newAssistantConf,
      },
    });
    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <div className="rounded p-4 flex flex-col items-center bg-indigo-950 text-white">
        <div className="w-full flex items-center justify-start">
          <div className="flex items-center justify-center">
            <SmartToyOutlined className="mr-2" />
            <div className="text-2xl">Templates of Assistant</div>
          </div>
        </div>
        <div className="w-full overflow-auto">
          <Table className="bg-white rounded mt-4">
            <TableHead>
              <TableRow>
                <TableCell></TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Author</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {templates.map((template, index) => (
                <TableRow key={template.templateId}>
                  <TableCell>
                    <AIAssistantAvatar
                      label={template.config.label}
                      icon={template.config.icon}
                    />
                  </TableCell>
                  <TableCell>{template.config.label}</TableCell>
                  <TableCell>{template.description}</TableCell>
                  <TableCell>{template.author}</TableCell>
                  <TableCell>
                    <Button
                      value={template.templateId}
                      key={index}
                      className="min-w-0 min-h-0 border-0"
                      onClick={handleAddTemplate(template.templateId)}
                    >
                      <Add />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </Dialog>
  );
};
