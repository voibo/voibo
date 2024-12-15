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
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
} from "@mui/material";
import { Delete, ViewAgenda } from "@mui/icons-material";
import {
  TargetCategory,
  TargetCategoryDetail,
  TargetClassification,
  TargetClassificationDetail,
} from "../../../../common/content/assisatant.js";
import { useConfirmDialog } from "../common/useConfirmDialog.jsx";
import { useMinutesAgendaStore } from "../../store/useAgendaStore.jsx";
import {
  Agenda,
  AgendaStatus,
  AgendaStatusDetail,
} from "../../../../common/content/agenda.js";
import { useVBStore } from "../../store/useVBStore.jsx";

export const AgendaEditView = (props: {
  agenda: Agenda;
  setEditMode: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const { agenda: originalAgenda, setEditMode } = props;
  const startTimestamp = useVBStore((state) => state.startTimestamp);
  const [currentAgenda, setCurrentAgenda] = useState(originalAgenda);
  const handleUpdateAgenda = () => {
    useMinutesAgendaStore(startTimestamp)((state) => state.setAgenda)({
      ...currentAgenda,
    });
    setEditMode(false);
  };

  // delete agenda
  const { confirmDialog, renderConfirmDialog: renderDeleteConfirmDialog } =
    useConfirmDialog();
  const handleDeleteAgendaWithConfirm = async () => {
    const { accepted } = await confirmDialog({
      content: (
        <>
          <div className="font-bold text-lg">Delete</div>
          <div className="p-4">
            Are you sure you want to delete this agenda?
          </div>
        </>
      ),
      acceptButtonLabel: "Delete",
      cancelButtonColor: "error",
    });
    if (!accepted) return; // キャンセル時は処理に進まない
    useMinutesAgendaStore(startTimestamp)((state) => state.removeAgenda)(
      currentAgenda.id
    );
  };

  // == FORM ==
  // agenda text
  const [state_agenda, set_agenda] = useState(currentAgenda.title);
  const handleAgendaTextChange = (
    event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement, Element>
  ) => {
    setCurrentAgenda({
      ...currentAgenda,
      title: event.target.value,
    });
  };

  // agenda detail
  const [state_detail, set_detail] = useState(currentAgenda.detail);
  const handleAgendaDetailChange = (
    event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement, Element>
  ) => {
    setCurrentAgenda({
      ...currentAgenda,
      detail: event.target.value,
    });
  };

  // Classification
  const handleClassificationChange = (
    event: SelectChangeEvent<TargetClassification>
  ) => {
    setCurrentAgenda({
      ...currentAgenda,
      classification: event.target.value as TargetClassification,
    });
  };

  // Classification
  const handleTopicCategoryChange = (
    event: SelectChangeEvent<TargetCategory>
  ) => {
    setCurrentAgenda({
      ...currentAgenda,
      category: event.target.value as TargetCategory,
    });
  };

  // status
  const handleStatusChange = (event: SelectChangeEvent<AgendaStatus>) => {
    setCurrentAgenda({
      ...currentAgenda,
      status: event.target.value as AgendaStatus,
    });
  };

  return (
    <div className="text-zinc-600">
      <div className="flex items-center mb-4">
        <div className="flex items-center text-xl">
          <ViewAgenda className="mr-2" />
          <span>Agenda</span>
        </div>
        <div className="ml-auto">
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={handleDeleteAgendaWithConfirm}
            className="min-w-0 border-0"
          >
            <Delete className="text-lg" />
          </Button>
          {renderDeleteConfirmDialog()}
        </div>
      </div>

      {/* Form data */}

      <div className="pt-2 grid grid-cols-1 space-y-4">
        <TextField
          fullWidth
          variant="outlined"
          size="small"
          label={"Title"}
          value={state_agenda}
          onChange={(event) => set_agenda(event.target.value)}
          onBlur={handleAgendaTextChange}
        ></TextField>

        <TextField
          fullWidth
          variant="outlined"
          multiline
          minRows={3}
          size="small"
          label={"Detail"}
          value={state_detail}
          onChange={(event) => set_detail(event.target.value)}
          onBlur={handleAgendaDetailChange}
        ></TextField>

        <div className="flex flex-row items-center">
          <FormControl size="small" fullWidth>
            <InputLabel id="classification">classification</InputLabel>
            <Select
              fullWidth
              labelId="classification"
              label={"classification"}
              value={currentAgenda.classification}
              onChange={handleClassificationChange}
            >
              {TargetClassificationDetail.map((classification) => {
                return (
                  <MenuItem
                    key={classification.label}
                    value={classification.label}
                  >
                    {classification.label}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        </div>

        <div className="flex flex-row items-center">
          <FormControl size="small" fullWidth>
            <InputLabel id="classification">Category</InputLabel>
            <Select
              fullWidth
              labelId="Category"
              label={"category"}
              value={currentAgenda.category}
              onChange={handleTopicCategoryChange}
            >
              {TargetCategoryDetail.map((category) => {
                return (
                  <MenuItem key={category.label} value={category.label}>
                    {category.label}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        </div>

        <div className="flex flex-row items-center">
          <FormControl size="small" fullWidth>
            <InputLabel id="classification">Status</InputLabel>
            <Select
              fullWidth
              labelId="Status"
              label={"status"}
              value={currentAgenda.status}
              onChange={handleStatusChange}
            >
              {AgendaStatusDetail.map((status) => {
                return (
                  <MenuItem key={status.value} value={status.value}>
                    {status.label}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        </div>

        <div className="flex items-center">
          <div className="ml-auto flex items-center">
            <Button variant="outlined" onClick={handleUpdateAgenda}>
              Update
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
