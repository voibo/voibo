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
import {
  Background,
  BackgroundVariant,
  PanOnScrollMode,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  useNodesInitialized,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { AgendaPanel } from "../agenda/AgendaPanel.jsx";
import { Content, getDefaultContent } from "../store/Content.js";
import { useMinutesContentStore } from "../store/useContentStore.jsx";
import {
  useVBReactflowStore,
  VBReactflowDispatchStore,
  VBReactflowState,
} from "../store/useVBReactflowStore.jsx";
import { useVBStore } from "../store/useVBStore.jsx";
import { CustomMiniMap } from "./CustomMiniMap.jsx";
import { DnDProvider, useDnD } from "./DnDContext.jsx";
import AssistantMessageNode from "./node/AssistantMessageNode.jsx";
import ContentNode from "./node/ContentNode.jsx";
import DiscussionNode from "./node/DisscussionNode.jsx";
import TopicHeaderNode from "./node/TopicHeaderNode.jsx";
import TopicNode from "./node/TopicNode.jsx";
import { StageToolBar } from "./StageToolBar.jsx";
import { focusFirstTopic, TargetFocuser } from "./TargetFocuser.jsx";
import { VBAction } from "../store/VBActionProcessor.js";

const ZOOM_MIN = 0.001;

export const VBNodeStage = (props: {}) => {
  // Warning: Seems like you have not used zustand provider as an ancestor を解消する方法
  // https://reactflow.dev/learn/troubleshooting
  // h-[calc(100vh-5rem)]
  return (
    <div className="w-screen h-[calc(100vh-4.5rem)]">
      <ReactFlowProvider>
        <DnDProvider>
          <VANodeStageCore />
        </DnDProvider>
      </ReactFlowProvider>
    </div>
  );
};

const selector = (state: VBReactflowState & VBReactflowDispatchStore) => ({
  nodes: state.nodes,
  edges: state.edges,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
  onNodeDragStart: state.onNodeDragStart,
  onNodeDragStop: state.onNodeDragStop,
  onNodesDelete: state.onNodesDelete,
  layout: state.layout,
});

export type VANodeStageGUIState = {
  lastAction: VBAction | null;
};

const VANodeStageCore = (props: {}) => {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeDragStart,
    onNodeDragStop,
    onNodesDelete,
  } = useVBReactflowStore(useShallow(selector));
  // handle nodes initialized and measure nodes.
  // after add new nodes, it will be called.
  const nodesInitialized = useNodesInitialized({
    includeHiddenNodes: true,
  });

  const [guiState, setGUIState] = useState<VANodeStageGUIState>({
    lastAction: null,
  });
  // subscribe lastAction to update GUI
  /*
  useVBStore.subscribe(
    (state) => state.lastAction,
    (lastAction) => {
      setGUIState((state) => ({
        ...state,
        lastAction: lastAction,
      }));
    }
  );
  */

  const reactFlow = useReactFlow();
  const flowState = useVBReactflowStore((state) => state);

  // handle lastAction
  useEffect(() => {
    if (guiState.lastAction && nodesInitialized && flowState.topicNodes) {
      switch (guiState.lastAction.type) {
        // トピックツリーの初期化
        case "deleteAllTopic": // minutes 再構築時
        case "openHomeMenu": // ホームメニューが開かれた場合、トピックツリーを再描画
          focusFirstTopic(reactFlow);
          break;
        case "createNewMinutes": //　minutes 作成時
        case "openMinutes": // minutes open時
          // このときには TargetFocuser の初期値によりFocusされる
          break;
        case "setTopic": // トピック変更時
          // FIXME
          // Topic の position 更新を永続化させるために useVBReactflowStore:updateNodePosition にて、
          // useVBStore.getState().vbDispatch({type: "updateTopic"/// を使わざるを得ず、
          // このタイミングでは setTopic が呼ばれない事になっている。
          // VBStore の永続化方法を zustand の middleware に統合するまで、setTopicをトリガーにすることができない。
          // focusLastTopic({ reactFlow, flowState, windowSize });
          break;
        default:
          break;
      }
    }
  }, [guiState.lastAction, nodesInitialized, flowState.topicNodes]);

  // DnD
  const reactFlowWrapper = useRef(null);
  const [type] = useDnD();
  const startTimestamp = useVBStore((stat) => stat.startTimestamp) ?? 0;

  const onDragOver = useCallback((event: any) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: any) => {
      event.preventDefault();
      if (!type) {
        return;
      }
      const position = reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newContext: Content = getDefaultContent();
      newContext.position = position;
      newContext.width = 200;
      newContext.content = "Dropped";
      useMinutesContentStore(startTimestamp).getState().setContent(newContext);
    },
    [type, startTimestamp]
  );

  return (
    <div ref={reactFlowWrapper} style={{ width: "100%", height: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        minZoom={ZOOM_MIN}
        maxZoom={2}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onNodesDelete={onNodesDelete}
        nodeTypes={{
          topic: TopicNode,
          topicHeader: TopicHeaderNode,
          discussion: DiscussionNode,
          assistantMessage: AssistantMessageNode,
          content: ContentNode,
        }}
        panOnScroll={true}
        panOnScrollMode={PanOnScrollMode.Free}
        panOnScrollSpeed={1}
        zoomOnScroll={false}
        selectionMode={SelectionMode.Partial}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <CustomMiniMap />
        <div className="absolute top-2 right-2 z-10">
          <AgendaPanel />
        </div>
      </ReactFlow>
      <StageToolBar />
      <div className="absolute bottom-2 right-2 z-10">
        <TargetFocuser />
      </div>
    </div>
  );
};
