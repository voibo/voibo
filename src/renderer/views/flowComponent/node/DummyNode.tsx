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
import { Node, NodeProps } from "@xyflow/react";

export type DummyNodeParam = {};
export type DummyNode = Node<DummyNodeParam, "dummy">;

export const DummyNode = (props: NodeProps<DummyNode>) => {
  return <div className="w-1 h-1 bg-red-400"></div>;
};

export default memo(DummyNode);