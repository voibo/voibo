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
import { Handle, Position } from "@xyflow/react";
import { useDetailViewDialog } from "../../common/useDetailViewDialog.jsx";

import { Node, NodeProps } from "@xyflow/react";
import { memo } from "react";
import { Message } from "../../../../common/agentManagerDefinition.js";
import { VAMessage } from "../../assistant/message/VAMessage.jsx";
import {
  useMinutesAssistantStore,
  VirtualAssistantConf,
} from "../../store/useAssistantsStore.jsx";
import { useVFStore } from "../../store/useVFStore.jsx";
import { NodeBase } from "./NodeBase.jsx";

export type AssistantMessageNodeParam = {
  assistantConfig: VirtualAssistantConf;
  content: Message;
  startTimestamp: number;
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
  return (
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
          assistantConfig={data.assistantConfig}
          message={data.content}
          startTimestamp={data.startTimestamp}
          detailViewDialog={detailViewDialog}
          avatarLocation="V"
        />
      </NodeBase>
      {renderDetailViewDialog()}
      <Handle
        id={`right-${props.id}`}
        type="source"
        position={Position.Right}
        className="invisible"
        isConnectable={false}
      />
    </>
  );
};
//export default AssistantMessageNode;

export default memo(AssistantMessageNode, (prevProps, nextProps) => {
  // 同一のコンテンツが選択されている場合= true は再描画しない
  const shouldNotUpdate =
    prevProps.data.startTimestamp === nextProps.data.startTimestamp &&
    prevProps.data.assistantConfig === nextProps.data.assistantConfig &&
    prevProps.data.content === nextProps.data.content &&
    prevProps.selected === nextProps.selected &&
    prevProps.data.content.position === nextProps.data.content.position &&
    prevProps.data.content.groupIds === nextProps.data.content.groupIds;
  return shouldNotUpdate;
});

// Util

export function removeAssistantMessage(data: AssistantMessageNodeParam) {
  const messageId = data.content.id;

  if (messageId) {
    console.log("removeAssistantMessage", messageId, data.assistantConfig);
    const minutesStartTimestamp = useVFStore.getState().startTimestamp;
    if (minutesStartTimestamp) {
      const assistantStore = useMinutesAssistantStore(
        minutesStartTimestamp
      ).getState();
      if (!assistantStore || !assistantStore._hasHydrated) return;
      assistantStore.assistantDispatch(data.assistantConfig)({
        type: "removeMessage",
        payload: { messageId },
      });
    }
  }
}
