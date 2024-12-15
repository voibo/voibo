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
import {
  Group,
  makeDefaultGroup,
  useMinutesGroupStore,
} from "../../store/useGroupStore.jsx";
import { useVBReactflowStore } from "../../store/useVBReactflowStore.jsx";

/**
 * Group 選択コンポーネント
 * 新規グループを作成した場合は、自動的に Group Store に追加される
 * @param props
 * @returns
 */
export const GroupSelector = (props: {
  startTimestamp: number; // 会議開始時刻
  onChange: (selectedGroups: Group[]) => void; // グループ変更時のコールバック
  initialGroupIds?: string[]; // 初期選択グループ
}) => {
  const { startTimestamp, onChange, initialGroupIds } = props;
  const options: Group[] = useMinutesGroupStore(startTimestamp)
    .getState()
    .getAllGroup();
  const initialGroups = (initialGroupIds ?? [])
    .map((id) => options.find((option) => option.id == id))
    .filter((group) => group !== undefined)
    .map((group) => group.name);
  const [selectedGroups, setSelectedGroups] = useState<string[]>(
    initialGroups ?? []
  );

  const handleAddGroup = (event: any, newValue: string[]) => {
    setSelectedGroups(newValue);
    // if new group is inputted, add this on group store.
    const groupStore = useMinutesGroupStore(startTimestamp).getState();
    const groups: Group[] = [];
    newValue.forEach((groupName) => {
      const existedGroup = options.find((option) => option.name == groupName);
      if (!existedGroup) {
        const newGroup = makeDefaultGroup(groupName);
        groupStore.setGroup(newGroup);
        groups.push(newGroup);
      } else {
        groups.push(existedGroup);
      }
    });
    onChange(groups);
  };

  return (
    <Autocomplete
      multiple
      freeSolo
      options={options.map((option) => option.name)}
      value={selectedGroups}
      onChange={(event, newValue) => handleAddGroup(event, newValue)}
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((option, index) => {
          const { key, ...tagProps } = getTagProps({ index });
          return <Chip label={option} key={key} {...tagProps} />;
        })
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label="Group"
          placeholder="Input or select group"
        />
      )}
    />
  );
};

export const GroupSelectorDialogBody = (props: {
  minutesStartTimestamp: number;
  initialGroupIds?: string[];
  handleClose: () => void;
}) => {
  const { minutesStartTimestamp, initialGroupIds, handleClose } = props;
  const [currentGroup, setCurrentGroup] = useState<Group[]>([]);
  const handleChangeGroup = (selectedGroups: Group[]) => {
    setCurrentGroup(selectedGroups);
  };
  const handleAddGroup = (event: any) => {
    useVBReactflowStore.getState().updateSequencedSelectionsGroup(currentGroup);
    useVBReactflowStore.getState().deselectAll();
    handleClose();
  };
  return (
    <div className="flex flex-row flex-grow-0">
      <div className="w-full">
        <GroupSelector
          startTimestamp={minutesStartTimestamp}
          onChange={handleChangeGroup}
          initialGroupIds={initialGroupIds ?? []}
        />
      </div>
      <Button onClick={handleAddGroup} variant="outlined" className="ml-2">
        Update
      </Button>
    </div>
  );
};
