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
import { useMinutesContentStore } from "../store/useContentStore.js";
import {
  getLayoutParam,
  useVFReactflowStore,
  VFReactflowDispatchStore,
  VFReactflowState,
} from "../store/useVFReactflowStore.jsx";
import { useVFStore, VFAction } from "../store/useVFStore.jsx";
import { CustomMiniMap } from "./CustomMiniMap.jsx";
import { DnDProvider, useDnD } from "./DnDContext.jsx";
import AssistantMessageNode from "./node/AssistantMessageNode.jsx";
import ContentNode from "./node/ContentNode.jsx";
import DiscussionNode from "./node/DisscussionNode.jsx";
import TopicHeaderNode from "./node/TopicHeaderNode.jsx";
import TopicNode from "./node/TopicNode.jsx";
import { StageToolBar } from "./StageToolBar.jsx";
import { TargetFocuser } from "./TargetFocuser.jsx";

const ZOOM_MIN = 0.001;

export const VANodeStage = (props: {}) => {
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

const selector = (state: VFReactflowState & VFReactflowDispatchStore) => ({
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
  lastVFAction: VFAction | null;
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
  } = useVFReactflowStore(useShallow(selector));
  // handle nodes initialized and measure nodes.
  // after add new nodes, it will be called.
  const nodesInitialized = useNodesInitialized({
    includeHiddenNodes: true,
  });
  const layoutParam = getLayoutParam();

  const [guiState, setGUIState] = useState<VANodeStageGUIState>({
    lastVFAction: null,
    //viewport: layoutParam.initialViewPort,
  });
  const reactFlow = useReactFlow();

  // subscribe lastAction to update GUI
  useVFStore.subscribe(
    (state) => state.lastAction,
    (lastAction) => {
      setGUIState((state) => ({
        ...state,
        lastVFAction: lastAction,
      }));
    }
  );

  useEffect(() => {
    if (nodesInitialized) {
      console.log("VANodeStageCore: nodesInitialized");
    }
  }, [nodesInitialized]);

  // handle lastVFAction

  useEffect(() => {
    if (guiState.lastVFAction) {
      //console.log("VANodeStageCore: lastVFAction", guiState.lastVFAction);
      switch (guiState.lastVFAction.type) {
        // トピックツリーの初期化
        case "deleteAllTopic": // minutes 再構築時
        case "openHomeMenu": // ホームメニューが開かれた場合、トピックツリーを再描画
          setGUIState({
            lastVFAction: null,
          });
          reactFlow.setViewport(getLayoutParam().initialViewPort); // 即時反映
          break;
        case "createNewMinutes": //　minutes 作成時
        case "openMinutes": // minutes open時
          //console.warn("VANodeStageCore: lastVFAction: openMinutes");
          setGUIState({
            lastVFAction: null,
          });
          const wait = new Promise((resolve) => setTimeout(resolve, 500));
          reactFlow.zoomTo(ZOOM_MIN).then(() => {
            // FIXME
            // 500ms は暫定で逃げている。呼び出すデータが大きいともっと時間がかかるかもしれない。
            // zustand の store を subscribe して、自動的に再描画するロジックと、おそらくぶつかっているので、そちらとの調整が必要
            wait.then(() => {
              /*
              console.warn(
                "VANodeStageCore: lastVFAction: openMinutes: setGUIState"
              );
              */
              reactFlow.setViewport(getLayoutParam().initialViewPort, {
                duration: 100,
              });
            });
          });
          break;
        case "setTopic": // トピック変更時
          console.log(
            "VANodeStageCore: lastVFAction: setTopic",
            guiState.lastVFAction.payload.topics
          );
          if (
            guiState.lastVFAction.payload.topics &&
            guiState.lastVFAction.payload.topics.length > 0
          ) {
            // 本来は agenda 単位で表示するべきだが、とりあえず最後のトピックにフォーカスする
            const messageId =
              guiState.lastVFAction.payload.topics[
                guiState.lastVFAction.payload.topics.length - 1
              ].id;
            const node = reactFlow.getNode(messageId);
            if (node) {
              reactFlow.fitView({ nodes: [node], maxZoom: 1, minZoom: 0.001 });
            }
          }
          break;
        default:
          break;
      }
    }
  }, [guiState.lastVFAction]);

  // DnD
  const reactFlowWrapper = useRef(null);
  const [type] = useDnD();
  const startTimestamp = useVFStore((stat) => stat.startTimestamp) ?? 0;

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
          //agenda: AgendaNode,
          content: ContentNode,
        }}
        panOnScroll={true}
        panOnScrollMode={PanOnScrollMode.Free}
        panOnScrollSpeed={1}
        zoomOnScroll={false}
        selectionMode={SelectionMode.Partial}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <CustomMiniMap guiState={guiState} setGUIState={setGUIState} />
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
