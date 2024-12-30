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
  useReactFlow,
  Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { AgendaPanel } from "../component/agenda/AgendaPanel.jsx";
import { Content, getDefaultContent } from "../../../common/content/content.js";
import { useMinutesContentStore } from "../store/useContentStore.jsx";
import {
  useVBReactflowStore,
  VBReactflowDispatchStore,
  VBReactflowState,
} from "../store/flow/useVBReactflowStore.jsx";
import { useVBStore } from "../store/useVBStore.jsx";
import { CustomMiniMap } from "./CustomMiniMap.jsx";
import { DnDProvider, useDnD } from "./DnDContext.jsx";
import AssistantMessageNode from "./node/AssistantMessageNode.jsx";
import ContentNode from "./node/ContentNode.jsx";
import DiscussionNode from "./node/DisscussionNode.jsx";
import TopicHeaderNode from "./node/TopicHeaderNode.jsx";
import TopicNode from "./node/TopicNode.jsx";
import { StageToolBar } from "./StageToolBar.jsx";
import { TargetFocuser } from "./TargetFocuser.jsx";
import { VBAction } from "../action/VBAction.js";
import {
  HeaderMainComponent,
  HeaderSubComponent,
} from "../component/main/HeaderComponent.jsx";

const ZOOM_MIN = 0.001;

export const VBNodeStage = (props: {}) => {
  // Warning: Seems like you have not used zustand provider as an ancestor を解消する方法
  // https://reactflow.dev/learn/troubleshooting
  // h-[calc(100vh-5rem)]
  // <div className="w-screen h-[calc(100vh-4.5rem)]">
  //<div className="w-screen h-screen">
  return (
    <ReactFlowProvider>
      <DnDProvider>
        <VANodeStageCore />
      </DnDProvider>
    </ReactFlowProvider>
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
  const startTimestamp = useVBStore((stat) => stat.startTimestamp);

  const reactFlow = useReactFlow();

  // DnD
  const reactFlowWrapper = useRef(null);
  const [type] = useDnD();

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

  const viewPort = useVBReactflowStore((state) => state.lastViewport);
  const handleViewPortChange = (viewPort: Viewport) => {
    //console.log("handleViewPortChange", viewPort);
    useVBReactflowStore.setState({ lastViewport: viewPort });
  };

  return (
    <div ref={reactFlowWrapper} className="w-screen h-screen">
      <ReactFlow
        viewport={viewPort}
        onViewportChange={handleViewPortChange}
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
      </ReactFlow>
      <div className="absolute top-2 left-2 z-10">
        <HeaderMainComponent />
      </div>
      <div className="absolute top-2 right-2 z-10">
        <HeaderSubComponent />
      </div>
      <div className="absolute top-20 right-2 z-10">
        <AgendaPanel />
      </div>
      <StageToolBar />
      <div className="absolute bottom-2 right-2 z-10">
        <TargetFocuser />
      </div>
    </div>
  );
};
