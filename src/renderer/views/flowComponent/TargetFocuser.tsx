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
import { FilterCenterFocus, Folder, ViewAgenda } from "@mui/icons-material";
import {
  Autocomplete,
  AutocompleteRenderGroupParams,
  Button,
  ListSubheader,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import { getNodesBounds, useReactFlow } from "@xyflow/react";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useAgendaStore } from "../store/useAgendaStore.jsx";
import { useMinutesGroupStore } from "../store/useGroupStore.jsx";
import {
  getLayoutParam,
  useVFReactflowStore,
} from "../store/useVFReactflowStore.jsx";
import { useVFStore } from "../store/useVFStore.jsx";
import useWindowSize from "../useWindowSize.jsx";
import { StageTransitionOption } from "./CustomMiniMap.jsx";

type TargetFocuserOption = {
  type: "system" | "agenda" | "group";
  label: string;
  id: string;
};

export const TargetFocuser = () => {
  const startTimestamp = useVFStore.getState().startTimestamp ?? 0;

  const systemList: Array<TargetFocuserOption> = [
    { type: "system", label: "All nodes", id: "all_nodes" },
    { type: "system", label: "First topic", id: "first_topic" },
    { type: "system", label: "Last topic", id: "last_topic" },
  ];
  const agendaList = useAgendaStore.getState().getAllAgendas();
  const groupList = useMinutesGroupStore(startTimestamp).getState().getAllGroup();

  const options: Array<TargetFocuserOption> = [
    ...systemList,
    ...agendaList.map((agenda) => ({
      type: "agenda" as const,
      label: agenda.title,
      id: agenda.id,
    })),
    ...groupList.map((group) => ({
      type: "group" as const,
      label: group.name,
      id: group.id,
    })),
  ];

  const [targetFocus, setTargetFocus] = useState<TargetFocuserOption>(
    options[0]
  );
  useEffect(() => {
    setTargetFocus(options[0]);
  }, [startTimestamp]);

  // フォーカス対象の変更
  const reactFlow = useReactFlow();
  const flowState = useVFReactflowStore((state) => state);
  const windowSize = useWindowSize();
  const handleFocus = () => {
    const layoutRoot = getLayoutParam().initialViewPort;
    switch (targetFocus.type) {
      case "system":
        switch (targetFocus.id) {
          case "all_nodes":
            reactFlow.fitView(StageTransitionOption);
            break;
          case "first_topic":
            reactFlow.setViewport(layoutRoot, StageTransitionOption);
            break;
          case "last_topic":
            const discussionNode = flowState.topicBothEndsNodes[1];
            const newY =
              (discussionNode?.position.y || 0) * -1 +
              windowSize.height -
              (discussionNode?.measured?.height ?? 0) -
              200; // header height と footer height を考慮したマジックナンバー;
            reactFlow.setViewport(
              {
                x: discussionNode.position.x * layoutRoot.zoom,
                y: newY * layoutRoot.zoom,
                zoom: layoutRoot.zoom,
              },
              StageTransitionOption
            );
            break;
        }
        break;
      case "agenda":
      case "group":
        if (targetFocus.id) {
          const targetNodes = flowState
            .getContentImplementedNodes()
            .filter((node) =>
              (targetFocus.type === "agenda"
                ? node.data.content.agendaIds ?? []
                : node.data.content.groupIds ?? []
              ).includes(targetFocus.id)
            );
          if (targetNodes.length === 0) {
            console.log("No nodes found in the agenda.");
            return;
          }
          reactFlow.fitBounds(
            getNodesBounds(targetNodes),
            StageTransitionOption
          );
        }
        break;
    }
  };
  useEffect(() => {
    handleFocus();
  }, [targetFocus]);

  const handleSelect = (event: any) => {
    const newTarget = options.find(
      (option) => option.id === event.target.value
    );
    if (newTarget) {
      setTargetFocus(newTarget);
    }
  };

  return (
    startTimestamp && (
      <div className="flex w-full rounded border border-white bg-indigo-950">
        <Select
          fullWidth
          size="small"
          variant="outlined"
          className="text-white "
          value={targetFocus.id}
          onChange={handleSelect}
        >
          {systemList.map((option) => (
            <MenuItem key={option.id} value={option.id}>
              {option.label}
            </MenuItem>
          ))}
          <ListSubheader className="text-white bg-blue-600 p-1 text-sm">
            <ViewAgenda className="mr-2" />
            Agenda
          </ListSubheader>
          {agendaList.map((option) => (
            <MenuItem
              key={option.id}
              value={option.id}
              className="bg-blue-50 flex items-center justify-start"
            >
              <ViewAgenda className="mr-2" sx={{ fontSize: "0.8rem" }} />
              {option.title}
            </MenuItem>
          ))}
          <ListSubheader className="text-white bg-orange-600 p-1 text-sm">
            <Folder className="mr-2" />
            Group
          </ListSubheader>
          {groupList.map((option) => (
            <MenuItem
              key={option.id}
              value={option.id}
              className="bg-orange-50"
            >
              <Folder className="mr-2" sx={{ fontSize: "0.8rem" }} />
              {option.name}
            </MenuItem>
          ))}
        </Select>

        <Button className="text-white min-w-0" onClick={handleFocus}>
          <FilterCenterFocus />
        </Button>
      </div>
    )
  );
};

const TargetFocuserAutocomplete = (props: {
  options: Array<TargetFocuserOption>;
  handleFocus: (event: any) => void;
  targetFocus: TargetFocuserOption;
  setTargetFocus: Dispatch<SetStateAction<TargetFocuserOption>>;
}) => {
  const { options, handleFocus, targetFocus, setTargetFocus } = props;

  const handleOnChange = (event: any, newValue: TargetFocuserOption | null) => {
    if (newValue) {
      setTargetFocus(newValue);
      handleFocus(event);
    }
  };

  const renderGroup = (params: AutocompleteRenderGroupParams) => {
    const { key, group, children } = params;
    let groupHeader = <></>;
    switch (group) {
      case "agenda":
        groupHeader = (
          <div className="text-white bg-blue-600 p-1 text-sm">
            <ViewAgenda className="mr-2" />
            Agenda
          </div>
        );
        break;
      case "group":
        groupHeader = (
          <div className="text-white bg-orange-600 p-1 text-sm">
            <Folder className="mr-2" />
            Group
          </div>
        );
        break;
      case "system": // 何も入れない
      default:
        break;
    }

    return (
      <div key={key}>
        {groupHeader}
        {children}
      </div>
    );
  };

  return (
    <>
      <Autocomplete
        fullWidth
        size="small"
        options={options}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        value={targetFocus}
        groupBy={(option) => option.type}
        renderGroup={renderGroup}
        renderInput={(params) => <TextField {...params} />}
        onChange={handleOnChange}
        className="text-white bg-white"
      />
      <Button className="text-white min-w-0" onClick={handleFocus}>
        <FilterCenterFocus />
      </Button>
    </>
  );
};
