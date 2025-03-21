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
import { TopicsHeader } from "../../component/topic/TopicsElement.jsx";

export function isTopicHeaderNode(node: Node): node is TopicHeaderNode {
  return node.type === "topicHeader";
}

export type TopicHeaderNodeParam = {};
export type TopicHeaderNode = Node<TopicHeaderNodeParam, "topicHeader">;

export const TopicHeaderNode = (props: NodeProps<TopicHeaderNode>) => {
  return (
    <>
      <TopicsHeader />
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

export default memo(TopicHeaderNode);
