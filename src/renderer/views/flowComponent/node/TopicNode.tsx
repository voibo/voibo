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
import { Handle, Position, Node, NodeProps } from "@xyflow/react";
import { useDetailViewDialog } from "../../component/common/useDetailViewDialog.jsx";
import { TopicsElement } from "../../component/topic/TopicsElement.jsx";
import { NodeBase } from "./NodeBase.jsx";
import { Topic } from "../../../../common/content/topic.js";

export type TopicNodeParam = {
  content: Topic;
};

export type TopicNode = Node<TopicNodeParam, "topic">;

export function isTopicNode(node: Node): node is TopicNode {
  return node.type === "topic";
}

export const TopicNodeComponent = (props: NodeProps<TopicNode>) => {
  //console.log("TopicNodeComponent", props);
  const data = props.data;
  const {
    detailViewDialog: AIMinutesDialog,
    renderDetailViewDialog: renderAIMinutesDialog,
    handleClose: handleAIMinutesDialogClose,
  } = useDetailViewDialog();

  return (
    <>
      <Handle
        id={`top-${props.id}`}
        type="target"
        position={Position.Top}
        isConnectable={false}
        className="invisible"
      />
      <NodeBase nodeProps={props}>
        <TopicsElement
          messageId={data.content.id}
          detailViewDialog={AIMinutesDialog}
          handleClose={handleAIMinutesDialogClose}
        />
      </NodeBase>
      {renderAIMinutesDialog()}
      <Handle
        id={`right-${props.id}`}
        type="source"
        position={Position.Right}
        className="invisible"
        isConnectable={false}
      />
      <Handle
        id={`bottom-${props.id}`}
        type="source"
        position={Position.Bottom}
        className="invisible"
        isConnectable={false}
      />
    </>
  );
};

export default memo(TopicNodeComponent, (prevProps, nextProps) => {
  // 同一のコンテンツが選択されている場合= true は再描画しない
  const shouldNotUpdate =
    prevProps.data.content.title === nextProps.data.content.title &&
    prevProps.selected === nextProps.selected &&
    prevProps.dragging === nextProps.dragging;
  return shouldNotUpdate;
});

// Util

/*
export function removeTopic(topicID: string) {
  processTopicAction({ type: "removeTopic", payload: { topicID } });
}
  */
