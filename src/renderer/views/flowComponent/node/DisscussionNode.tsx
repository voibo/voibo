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
import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import { useDiscussionHistory } from "../../component/discussion/DiscussionHistory.jsx";
import { memo } from "react";

export function isDiscussionNode(node: Node): node is DiscussionNode {
  return node.type === "discussion";
}

export type DiscussionNodeParam = {};

export type DiscussionNode = Node<DiscussionNodeParam, "discussion">;

const DiscussionNodeComponent = (props: NodeProps<DiscussionNode>) => {
  // FIXME
  // Zustand などで情報を管理しないと、結局のところ、このコンポーネントはリアルタイムには更新されない
  const [DiscussionHistory, scrollToBadge] = useDiscussionHistory();

  return (
    <div
      className={
        // https://reactflow.dev/api-reference/types/node-props#notes
        "nowheel"
      }
    >
      <Handle
        id={`top-${props.id}`}
        type="target"
        position={Position.Top}
        onConnect={(params) => console.log("handle onConnect", params)}
        isConnectable={false}
        className="invisible"
      />
      {DiscussionHistory}
    </div>
  );
};

// メモ化したコンポーネントをエクスポート
const DiscussionNode = memo(DiscussionNodeComponent, (prevProps, nextProps) => {
  // 必要に応じてカスタムの比較ロジックを実装
  // 同じIDを持つノードであれば再レンダリングしない
  return (
    prevProps.id === nextProps.id &&
    prevProps.selected === nextProps.selected &&
    prevProps.dragging === nextProps.dragging
  );
});

// デバッグ用にdisplayNameを設定
DiscussionNode.displayName = "DiscussionNode";

export default DiscussionNode;
