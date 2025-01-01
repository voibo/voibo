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
  Node,
  useNodesInitialized,
  useReactFlow,
  Viewport,
} from "@xyflow/react";
import { useEffect, useState } from "react";
import { useMinutesAgendaStore } from "../store/useAgendaStore.jsx";
import { useMinutesGroupStore } from "../store/useGroupStore.jsx";
import {
  getLayoutParam,
  useVBReactflowStore,
  VBReactflowDispatchStore,
  VBReactflowState,
} from "../store/flow/useVBReactflowStore.jsx";
import { useVBStore } from "../store/useVBStore.jsx";
import { useWindowSize } from "../component/main/useWindowSize.jsx";
import { isTopicNode } from "./node/TopicNode.jsx";
import { isAssistantMessageNode } from "./node/AssistantMessageNode.jsx";
import { isDiscussionNode } from "./node/DisscussionNode.jsx";
import { isTopicHeaderNode } from "./node/TopicHeaderNode.jsx";
import { isContentNode } from "./node/ContentNode.jsx";

//export const StageTransitionOption = { duration: 100 }; // duration を入れると、then が効かなくなるので、使い方に注意

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
    (state) => state // 全てのアジェンダ監視
  ).getAllAgendas();
  const groupList = useMinutesGroupStore(startTimestamp)(
    (state) => state // 全てのグループ監視
  ).getAllGroup();

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

  // node 追加時
  useEffect(() => {
    if (nodesInitialized) {
      expandStage(reactFlow).then((lastViewport) => {
        console.log(
          "TargetFocuser: nodesInitialized: 1:",
          startTimestamp,
          lastViewport
        );
        focusAppendedSpecialNode({
          reactFlow,
          flowState,
          windowSize,
          lastViewport,
        });
      });
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
    <div className="flex w-full rounded border border-white bg-indigo-950">
      <Button className="text-white min-w-0" onClick={handleFocus}>
        <FilterCenterFocus />
      </Button>
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
          <MenuItem key={option.id} value={option.id} className="bg-orange-50">
            <Folder className="mr-2" sx={{ fontSize: "0.8rem" }} />
            {option.name}
          </MenuItem>
        ))}
      </Select>
    </div>
  );
};

// == Focus function ==
const EXTEND_VIEWPORT = {
  x: 0,
  y: 0,
  zoom: 0.01,
};
function expandStage(
  reactFlow: ReturnType<typeof useReactFlow>
): Promise<Viewport> {
  console.log("TargetFocuser: expandStage");
  const lastViewport = useVBReactflowStore.getState().lastViewport;
  return reactFlow.setViewport(EXTEND_VIEWPORT).then(() => lastViewport);
}

export function focusAppendedSpecialNode(props: {
  reactFlow: ReturnType<typeof useReactFlow>;
  flowState: VBReactflowState & VBReactflowDispatchStore;
  windowSize: ReturnType<typeof useWindowSize>;
  lastViewport: Viewport;
}): void {
  const { reactFlow, flowState, windowSize, lastViewport } = props;
  const targetNodes = flowState.lastAppendedNodes;

  console.log("TargetFocuser: 0", targetNodes);

  if (targetNodes.length === 0) {
    console.log(`No last appended nodes found.`);
  }

  //  if added type is content, do nothing
  if (targetNodes.every((node) => isContentNode(node))) {
    console.log("TargetFocuser: focusAppendedSpecialNode: content");
    reactFlow.setViewport(lastViewport);
    return;
  }

  // 1. if included topic, focus last topic
  if (targetNodes.some((node) => isTopicNode(node))) {
    console.log("TargetFocuser: focusAppendedSpecialNode: included topic");
    focusLastTopic(props);
    return;
  }
  // 2. if included AssistantMessage and no topic, focus last AssistantMessage and connected nodes
  const lastAssistantNode = targetNodes.findLast((node) =>
    isAssistantMessageNode(node)
  );
  if (lastAssistantNode) {
    const message = useVBReactflowStore
      .getState()
      .getAssistantMessageByNodeID(lastAssistantNode.data.id);
    let connectedSource: Node[] = [];
    if (message) {
      connectedSource = useVBReactflowStore
        .getState()
        .nodes.filter((node) => message.connectedMessageIds.includes(node.id));
    }
    console.log("TargetFocuser: focusAppendedSpecialNode: lastAssistantNode");
    reactFlow.fitBounds(
      getNodesBounds([lastAssistantNode, ...connectedSource])
    );
    return;
  }

  if (
    // 3. if included only TopicHeader and Discussion, focus first topic
    // 4. if last viewport is EXTEND_VIEWPORT, focus first topic
    (targetNodes.length === 2 &&
      targetNodes.every(
        (node) => isDiscussionNode(node) || isTopicHeaderNode(node)
      )) ||
    // 4. if last viewport is EXTEND_VIEWPORT, focus first topic
    (lastViewport.x === EXTEND_VIEWPORT.x &&
      lastViewport.y === EXTEND_VIEWPORT.y &&
      lastViewport.zoom === EXTEND_VIEWPORT.zoom)
  ) {
    console.log(
      "TargetFocuser: focusAppendedSpecialNode: header and discussion"
    );
    // Hack:  FIXME: focusFirstTopic does not work without waiting 500ms. Why?
    setTimeout(() => {
      focusFirstTopic(reactFlow);
    }, 500);
    return;
  }

  // Hack:  FIXME: focusFirstTopic does not work without waiting 500ms. Why?
  reactFlow.setViewport(lastViewport);
}

export function focusAllNodes(
  reactFlow: ReturnType<typeof useReactFlow>
): Promise<boolean> {
  console.log("TargetFocuser: focusAllNodes");
  return reactFlow.fitView();
}

export function focusFirstTopic(
  reactFlow: ReturnType<typeof useReactFlow>
): Promise<boolean> {
  console.log("TargetFocuser: focusFirstTopic");
  return reactFlow.setViewport(getLayoutParam().initialViewPort);
}

export function focusLastTopic(props: {
  reactFlow: ReturnType<typeof useReactFlow>;
  flowState: VBReactflowState & VBReactflowDispatchStore;
  windowSize: ReturnType<typeof useWindowSize>;
}): Promise<boolean> {
  const { reactFlow, flowState, windowSize } = props;
  const layoutRoot = getLayoutParam().initialViewPort;
  const discussionNode = flowState.topicBothEndsNodes[1];
  const newY =
    (discussionNode?.position.y || 0) * -1 +
    windowSize.height -
    (discussionNode?.measured?.height ?? 0) -
    100; // the magic number considering the header height and footer height
  const newViewPort = {
    x: Math.max(discussionNode.position.x * layoutRoot.zoom, layoutRoot.x),
    y: Math.min(newY * layoutRoot.zoom, layoutRoot.y),
    zoom: layoutRoot.zoom,
  };
  console.log("TargetFocuser: focusLastTopic:", newViewPort);
  return reactFlow.setViewport(newViewPort);
}

export function focusGroup(props: {
  reactFlow: ReturnType<typeof useReactFlow>;
  flowState: VBReactflowState & VBReactflowDispatchStore;
  targetId: string;
  targetType: "group" | "agenda";
}): Promise<boolean> {
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
  }
  return reactFlow.fitBounds(getNodesBounds(targetNodes));
}
