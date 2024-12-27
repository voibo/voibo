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
import { memo } from "react";
import { Node, NodeProps, Handle, Position } from "@xyflow/react";
import { useDetailViewDialog } from "../../component/common/useDetailViewDialog.jsx";
import { VAMessage } from "../../component/assistant/message/VAMessage.jsx";
import { useVBStore } from "../../store/useVBStore.jsx";
import { ContentNodeBaseParam, NodeBase } from "./NodeBase.jsx";
import { useVBReactflowStore } from "../../store/flow/useVBReactflowStore.jsx";

export type AssistantMessageNodeParam = ContentNodeBaseParam & {
  assistantId: string;
};

export type AssistantMessageNode = Node<
  AssistantMessageNodeParam,
  "assistantMessage"
>;

export const AssistantMessageNode = (
  props: NodeProps<AssistantMessageNode>
) => {
  const data = props.data;
  const { detailViewDialog, renderDetailViewDialog, handleClose } =
    useDetailViewDialog();
  const startTimestamp = useVBStore((state) => state.startTimestamp);
  const assistantConfig = useVBReactflowStore(
    (state) => state
  ).getVirtualAssistantConfByNodeID(data.id);
  const message = useVBReactflowStore(
    (state) => state
  ).getAssistantMessageByNodeID(data.id);

  return (
    assistantConfig &&
    message && (
      <>
        <Handle
          id={`left-${props.id}`}
          type="target"
          position={Position.Left}
          onConnect={(params) => console.log("handle onConnect", params)}
          isConnectable={true}
          className="invisible"
        />
        <NodeBase nodeProps={props}>
          <VAMessage
            startTimestamp={startTimestamp}
            assistantConfig={assistantConfig}
            message={message}
            detailViewDialog={detailViewDialog}
            avatarLocation="V"
          />
        </NodeBase>
        <Handle
          id={`right-${props.id}`}
          type="source"
          position={Position.Right}
          className="invisible"
          isConnectable={false}
        />
        {renderDetailViewDialog()}
      </>
    )
  );
};

export default memo(AssistantMessageNode, (prevProps, nextProps) => {
  // 同一のコンテンツが選択されている場合= true は再描画しない
  const shouldNotUpdate =
    prevProps.data.id === nextProps.data.id &&
    prevProps.data.assistantId === nextProps.data.assistantId &&
    prevProps.selected === nextProps.selected;
  return shouldNotUpdate;
});
