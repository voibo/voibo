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
import { Autocomplete, Button, Chip, TextField } from "@mui/material";
import { useMinutesAgendaStore } from "../../store/useAgendaStore.jsx";
import { useVBReactflowStore } from "../../store/useVBReactflowStore.jsx";
import { Agenda } from "../../../../common/content/agenda.js";
import { useVBStore } from "../../store/useVBStore.jsx";

/**
 * Agenda 選択コンポーネント
 * @param props
 * @returns
 */
export const AgendaSelector = (props: {
  onChange: (selectedAgendas: Agenda[]) => void; // グループ変更時のコールバック
  initialAgendaIds?: string[]; // 初期選択グループ
}) => {
  const { onChange, initialAgendaIds } = props;
  const options: Agenda[] = useMinutesAgendaStore(
    useVBStore((state) => state.startTimestamp)
  )((state) => state.getAllAgendas)();
  const initialAgendas = (initialAgendaIds ?? [])
    .map((id) => options.find((option) => option.id == id))
    .filter((agenda) => agenda !== undefined)
    .map((agenda) => agenda.title);
  const [selectedAgendas, setSelectedAgendas] = useState<string[]>(
    initialAgendas ?? []
  );

  const handleUpdateAgenda = (event: any, newValue: string[]) => {
    setSelectedAgendas(newValue);
    // update agenda
    const agendas: Agenda[] = [];
    newValue.forEach((agendaTitle) => {
      const existedAgenda = options.find(
        (option) => option.title == agendaTitle
      );
      if (existedAgenda) {
        agendas.push(existedAgenda);
      }
    });
    onChange(agendas);
  };

  return (
    <Autocomplete
      multiple
      options={options.map((option) => option.title)}
      value={selectedAgendas}
      onChange={(event, newValue) => handleUpdateAgenda(event, newValue)}
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((option, index) => {
          const { key, ...tagProps } = getTagProps({ index });
          return <Chip label={option} key={key} {...tagProps} />;
        })
      }
      renderInput={(params) => (
        <TextField {...params} label="Agenda" placeholder="Select agenda" />
      )}
    />
  );
};

export const AgendaSelectorDialogBody = (props: {
  initialAgendaIds?: string[];
  handleClose: () => void;
}) => {
  const { initialAgendaIds, handleClose } = props;
  const [currentAgendas, setCurrentAgendas] = useState<Agenda[]>([]);
  const handleChangeAgenda = (selectedAgendas: Agenda[]) => {
    setCurrentAgendas(selectedAgendas);
  };
  const handleUpdateAgenda = (event: any) => {
    useVBReactflowStore
      .getState()
      .updateSequencedSelectionsAgenda(currentAgendas);
    useVBReactflowStore.getState().deselectAll();
    handleClose();
  };
  return (
    <div className="flex flex-row flex-grow-0">
      <div className="w-full">
        <AgendaSelector
          onChange={handleChangeAgenda}
          initialAgendaIds={initialAgendaIds ?? []}
        />
      </div>
      <Button onClick={handleUpdateAgenda} variant="outlined" className="ml-2">
        Update
      </Button>
    </div>
  );
};
