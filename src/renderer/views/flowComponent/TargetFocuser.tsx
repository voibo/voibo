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
import { FilterCenterFocus, Folder, ViewAgenda } from "@mui/icons-material";
import { Button, ListSubheader, MenuItem, Select } from "@mui/material";
import {
  getNodesBounds,
  useNodesInitialized,
  useReactFlow,
} from "@xyflow/react";
import { useEffect, useState } from "react";
import { useMinutesAgendaStore } from "../store/useAgendaStore.jsx";
import { useMinutesGroupStore } from "../store/useGroupStore.jsx";
import {
  getLayoutParam,
  useVBReactflowStore,
  VBReactflowDispatchStore,
  VBReactflowState,
} from "../store/useVBReactflowStore.jsx";
import { useVBStore } from "../store/useVBStore.jsx";
import { useWindowSize } from "../component/main/useWindowSize.jsx";

export const StageTransitionOption = { padding: 0.1, duration: 100 };

type TargetFocuserOption = {
  type: "system" | "agenda" | "group";
  label: string;
  id: string;
};

export const TargetFocuser = () => {
  const startTimestamp = useVBStore((state) => state.startTimestamp);

  const reactFlow = useReactFlow();
  const nodesInitialized = useNodesInitialized({
    includeHiddenNodes: true,
  });
  const flowState = useVBReactflowStore((state) => state);
  const windowSize = useWindowSize();

  const systemList: Array<TargetFocuserOption> = [
    { type: "system", label: "All nodes", id: "all_nodes" },
    { type: "system", label: "First topic", id: "first_topic" },
    { type: "system", label: "Last topic", id: "last_topic" },
  ];
  const agendaList = useMinutesAgendaStore(startTimestamp)(
    (state) => state.getAllAgendas
  )();
  const groupList = useMinutesGroupStore(startTimestamp)
    .getState()
    .getAllGroup();

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

  // minutes 変更時
  useEffect(() => {
    if (nodesInitialized) {
      const timerId = setTimeout(() => setTargetFocus(options[2]), 500); // 500 msec はマジックナンバー
      return () => clearTimeout(timerId);
    }
  }, [startTimestamp, nodesInitialized]);

  // フォーカス対象の変更
  const handleFocus = () => {
    switch (targetFocus.type) {
      case "system":
        switch (targetFocus.id) {
          case "all_nodes":
            focusAllNodes(reactFlow);
            break;
          case "first_topic":
            focusFirstTopic(reactFlow);
            break;
          case "last_topic":
            focusLastTopic({ reactFlow, flowState, windowSize });
            break;
        }
        break;
      case "agenda":
      case "group":
        if (targetFocus.id) {
          focusGroup({
            reactFlow,
            flowState,
            targetId: targetFocus.id,
            targetType: targetFocus.type,
          });
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

// == Focus function ==

export function focusAllNodes(
  reactFlow: ReturnType<typeof useReactFlow>
): void {
  reactFlow.fitView(StageTransitionOption);
}

export function focusFirstTopic(
  reactFlow: ReturnType<typeof useReactFlow>
): void {
  console.log("focusFirstTopic");
  reactFlow.setViewport(
    getLayoutParam().initialViewPort,
    StageTransitionOption
  );
}

export function focusLastTopic(props: {
  reactFlow: ReturnType<typeof useReactFlow>;
  flowState: VBReactflowState & VBReactflowDispatchStore;
  windowSize: ReturnType<typeof useWindowSize>;
}): void {
  const { reactFlow, flowState, windowSize } = props;
  const layoutRoot = getLayoutParam().initialViewPort;
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
}

export function focusGroup(props: {
  reactFlow: ReturnType<typeof useReactFlow>;
  flowState: VBReactflowState & VBReactflowDispatchStore;
  targetId: string;
  targetType: "group" | "agenda";
}): void {
  const { reactFlow, flowState, targetId, targetType } = props;
  const targetNodes = flowState
    .getContentImplementedNodes()
    .filter((node) =>
      (targetType === "agenda"
        ? node.data.agendaIds ?? []
        : node.data.groupIds ?? []
      ).includes(targetId)
    );
  if (targetNodes.length === 0) {
    console.log(`No nodes found in the ${targetType}.`);
    return;
  }
  reactFlow.fitBounds(getNodesBounds(targetNodes), StageTransitionOption);
}
