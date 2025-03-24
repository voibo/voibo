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
import { useRef, useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { AgendaPanel } from "../component/agenda/AgendaPanel.jsx";
import {
  useVBReactflowStore,
  VBReactflowDispatchStore,
  VBReactflowState,
} from "../store/flow/useVBReactflowStore.jsx";
import { CustomMiniMap } from "./CustomMiniMap.jsx";
import { DnDProvider, useDnD } from "./DnDContext.jsx";
import AssistantMessageNode from "./node/AssistantMessageNode.jsx";
import ContentNode from "./node/content/ContentNode.jsx";
import DiscussionNode from "./node/DisscussionNode.jsx";
import TopicHeaderNode from "./node/TopicHeaderNode.jsx";
import TopicNode from "./node/TopicNode.jsx";
import { StageToolBar } from "./StageToolBar.jsx";
import { TargetFocuser } from "./TargetFocuser.jsx";
import { VBAction } from "../action/VBAction.js";
import { HeaderMainComponent } from "../component/main/HeaderComponent.jsx";
import { processContentAction } from "../action/ContentAction.js";
import { NoteAdd } from "@mui/icons-material";

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

export const DragCreateSupportNodeType = {
  Text: "Text",
  Image: "Image",
} as const;

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
  const reactFlow = useReactFlow();

  // DnD
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { type, position, isDragging, setDragCallbacks } = useDnD();

  useEffect(() => {
    setDragCallbacks({
      onDragEnd: (draggedType, finalPosition) => {
        if (
          !reactFlowWrapper.current ||
          !finalPosition ||
          !(draggedType in DragCreateSupportNodeType)
        )
          return;

        const bounds = reactFlowWrapper.current.getBoundingClientRect();
        const flowPosition = reactFlow.screenToFlowPosition({
          x: finalPosition.x - bounds.left,
          y: finalPosition.y - bounds.top,
        });

        switch (draggedType) {
          case DragCreateSupportNodeType.Text:
            processContentAction({
              type: "addTextContent",
              payload: {
                position: flowPosition,
                content: "New content",
                width: 200,
              },
            });
            break;
          case DragCreateSupportNodeType.Image:
            break;
        }
      },
    });
  }, [reactFlow, setDragCallbacks]);

  let dndPreview = <></>;
  if (isDragging) {
    switch (type) {
      case DragCreateSupportNodeType.Text:
        dndPreview = (
          <div
            style={{
              position: "fixed",
              left: 0,
              top: 0,
              pointerEvents: "none",
              zIndex: 1000,
              opacity: 0.7,
              transform: `translate(${position?.x}px, ${position?.y}px)`,
            }}
          >
            <div className="bg-white p-2 rounded shadow">
              <NoteAdd />
            </div>
          </div>
        );
        break;
    }
  }

  // Viewport
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
        <div className="absolute bottom-2 right-2 z-10">
          <CustomMiniMap />
        </div>
      </ReactFlow>

      {/* Tools */}
      <div className="absolute top-2 left-2 z-10">
        <HeaderMainComponent />
      </div>
      <div className="absolute top-2 right-2 z-10">
        <AgendaPanel />
      </div>
      <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
        <StageToolBar />
      </div>
      <div className="absolute bottom-2 left-2 z-10">
        <TargetFocuser />
      </div>

      {dndPreview}
    </div>
  );
};
