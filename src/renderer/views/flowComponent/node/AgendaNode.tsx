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
import { Chip } from "@mui/material";
import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import { memo, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAgendaStore } from "../../store/useAgendaStore.jsx";

export type AgendaNodeParam = {
  agendaId: string;
};

export type AgendaNode = Node<AgendaNodeParam, "agenda">;

const AgendaNode = (props: NodeProps<AgendaNode>) => {
  const data = props.data;
  const agendasStore = useAgendaStore((state) => state);
  let agenda = agendasStore.getAgenda(data.agendaId);

  useEffect(() => {
    if (agendasStore._hasHydrated) {
      agenda = agendasStore.getAgenda(data.agendaId);
    }
  }, [agendasStore._hasHydrated]);

  return agenda ? (
    <>
      <div className="p-4 rounded bg-blue-600 text-white">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          className={"markdown text-3xl"}
        >
          {agenda.title}
        </ReactMarkdown>
        {agenda.classification != "all" && (
          <Chip label={agenda.classification} />
        )}
        {agenda.category != "Unknown" && <Chip label={agenda.category} />}
      </div>
      <Handle
        id={`right-${props.id}`}
        type="source"
        position={Position.Right}
        className="w-0 h-0 border-none rounded-none"
        isConnectable={false}
      />
    </>
  ) : (
    <></>
  );
};

export default memo(AgendaNode, (prevProps, nextProps) => {
  const shouldNotUpdate = prevProps.data.agendaId === nextProps.data.agendaId;
  return shouldNotUpdate;
});
