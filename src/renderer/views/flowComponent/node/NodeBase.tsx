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
import { Folder, ViewAgenda } from "@mui/icons-material";
import { Button, ButtonGroup } from "@mui/material";
import { NodeToolbar } from "@xyflow/react";
import { NodeProps, Position } from "@xyflow/system";
import { AgendaSelectorDialogBody } from "../../component/agenda/AgendaSelector.jsx";
import { AIAssistantAvatar } from "../../component/assistant/message/AIAssistantAvatar.jsx";
import { useDetailViewDialog } from "../../component/common/useDetailViewDialog.jsx";
import { GroupSelectorDialogBody } from "../../component/group/GroupSelector.jsx";
import { useMinutesAgendaStore } from "../../store/useAgendaStore.jsx";
import {
  makeInvokeParam,
  useMinutesAssistantStore,
  VirtualAssistantConf,
} from "../../store/useAssistantsStore.jsx";
import { useMinutesGroupStore } from "../../store/useGroupStore.jsx";
import { useVBReactflowStore } from "../../store/useVBReactflowStore.jsx";
import { useVBStore } from "../../store/useVBStore.jsx";
import { AssistantMessageNode } from "./AssistantMessageNode.jsx";
import { ContentNode } from "./ContentNode.jsx";
import { TopicNode } from "./TopicNode.jsx";
import { useMinutesStore } from "../../store/useMinutesStore.jsx";
import { Agenda } from "../../../../common/content/agenda.js";

export const NodeBase = (props: {
  nodeProps: NodeProps<TopicNode | AssistantMessageNode | ContentNode>;
  children: React.ReactNode;
}) => {
  const { nodeProps } = props;
  const startTimestamp = useVBStore((state) => state.startTimestamp);
  const isNoMinutes = useVBStore((state) => state.isNoMinutes)();

  // selectedSequence
  const cssStyle = nodeProps.selected
    ? "relative border-4 border-green-500"
    : "relative";
  const selectedSequenceIndex = useVBReactflowStore(
    (state) => state.selectedSequences
  ).findIndex((seq) => seq === nodeProps.id);

  const selectedSequence =
    selectedSequenceIndex > -1 ? (
      <div
        style={{
          position: "absolute",
          top: "-1rem",
          left: "-1rem",
          zIndex: 10,
        }}
      >
        <div className="rounded-full bg-green-500 text-white w-8 h-8 flex justify-center items-center">
          <span>{selectedSequenceIndex + 1}</span>
        </div>
      </div>
    ) : null;

  const isLastSelected = useVBReactflowStore(
    (state) =>
      state.selectedSequences[state.selectedSequences.length - 1] ===
      nodeProps.id
  );

  // assistants
  const assistants = useMinutesStore(startTimestamp)(
    (state) => state.assistants
  ).filter((assistant) => assistant.updateMode === "manual");

  // agendaList
  const agendaList = (props.nodeProps.data.content.agendaIds ?? []) // 過渡期のためのデータ変換
    .map((agendaId) =>
      useMinutesAgendaStore(startTimestamp).getState().getAgenda(agendaId)
    )
    .filter((agenda) => agenda !== undefined);

  // change group
  const { detailViewDialog, renderDetailViewDialog, handleClose } =
    useDetailViewDialog();

  const handleGroup = (event: any) => {
    if (isNoMinutes) return;
    detailViewDialog({
      content: (
        <GroupSelectorDialogBody
          minutesStartTimestamp={startTimestamp}
          initialGroupIds={nodeProps.data.content.groupIds ?? []}
          handleClose={handleClose}
        />
      ),
      dialogConf: {
        fullWidth: true,
      },
    });
  };

  // change agenda
  const handleAgenda = (event: any) => {
    if (isNoMinutes) return;
    detailViewDialog({
      content: (
        <AgendaSelectorDialogBody
          initialAgendaIds={nodeProps.data.content.agendaIds ?? []}
          handleClose={handleClose}
        />
      ),
      dialogConf: {
        fullWidth: true,
      },
    });
  };

  return (
    <>
      <div className={cssStyle}>
        {selectedSequence}

        <NodeToolbar isVisible={isLastSelected} position={Position.Left}>
          <ButtonGroup orientation="vertical">
            <Button
              onClick={handleAgenda}
              className="min-w-0 min-h-0 p-1 text-white border-white bg-blue-600"
            >
              <ViewAgenda />
            </Button>
            <Button
              onClick={handleGroup}
              className="min-w-0 min-h-0 p-1 text-white border-white bg-orange-600"
            >
              <Folder />
            </Button>
          </ButtonGroup>
        </NodeToolbar>

        <NodeToolbar isVisible={isLastSelected} position={Position.Right}>
          <ButtonGroup
            orientation="vertical"
            aria-label="Vertical button group"
          >
            {assistants.map((assistantConfig, index) => (
              <AssistantButton key={index} assistantConfig={assistantConfig} />
            ))}
          </ButtonGroup>
        </NodeToolbar>

        {props.children}

        <div
          className="w-full h-0" // Absolute does not work without defining the height property
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            zIndex: 10, // Adust z-index to be displayed above the child element
          }}
        >
          <div className="flex justify-between items-start">
            <BelongAgendaChips agendaList={agendaList} />
            <BelongGroupChips
              groupIds={nodeProps.data.content.groupIds ?? []}
            />
          </div>
        </div>
      </div>

      {renderDetailViewDialog()}
    </>
  );
};

const AssistantButton = (props: { assistantConfig: VirtualAssistantConf }) => {
  const { assistantConfig } = props;
  const isNoMinutes = useVBStore((state) => state.isNoMinutes)();
  const minutesStartTimestamp = useVBStore((state) => state.startTimestamp);
  const assistantStore = useMinutesAssistantStore(minutesStartTimestamp);
  const isAssistantHydrated = assistantStore((state) => state.hasHydrated);

  const onProcess = assistantStore(
    (state) => state // assistantMap の変更を監視するため全体を取得(onProcess の変更を検知するため)
  ).getOrInitAssistant(assistantConfig)?.onProcess;

  const handleAssistantButtonClick = () => {
    if (!isAssistantHydrated) return;
    assistantStore.getState().assistantDispatch(assistantConfig)({
      type: "invokeAssistant",
      payload: {
        queue: [
          makeInvokeParam({
            basePrompt: assistantConfig.aiConfig.systemPrompt,
            messages: useVBReactflowStore.getState().getSequencedSelection(),
            attachOption: assistantConfig.attachOption ?? {
              attachment: "topic",
              target: "manualSelected",
            },
          }),
        ],
      },
    });
  };

  return !isNoMinutes && isAssistantHydrated ? (
    <Button
      value={assistantConfig.assistantId}
      className="min-w-0 min-h-0 p-1 text-white border-white bg-sky-900 disabled:text-white/25"
      onClick={handleAssistantButtonClick}
      disabled={onProcess}
    >
      <AIAssistantAvatar
        label={assistantConfig.label}
        icon={assistantConfig.icon}
        sx={{ width: "1.5rem", height: "1.5rem" }}
      />
      <div className="ml-2">{assistantConfig.label}</div>
    </Button>
  ) : (
    <></>
  );
};

const BelongAgendaChips = (props: { agendaList: Agenda[] }) => {
  const { agendaList } = props;
  return (
    <div className="flex flex-col items-start justify-center mt-1">
      {agendaList.map((agenda, index) => (
        <div
          key={index}
          className="flex items-center justify-center round rounded-full bg-blue-600 p-1 mt-1"
        >
          <div className="round rounded-full bg-white text-blue-600 h-6 w-6 flex items-center justify-center mr-2">
            <ViewAgenda sx={{ fontSize: "0.75rem" }} />
          </div>
          <div className="text-white mr-2">{agenda.title}</div>
        </div>
      ))}
    </div>
  );
};

const BelongGroupChips = (props: { groupIds: string[] }) => {
  const { groupIds } = props;
  const isNoMinutes = useVBStore((state) => state.isNoMinutes)();
  const minutesStartTimestamp = useVBStore((state) => state.startTimestamp);
  const isGroupHydrated = useMinutesGroupStore(minutesStartTimestamp)(
    (state) => state.hasHydrated
  );

  const getGroup = useMinutesGroupStore(minutesStartTimestamp)(
    (state) => state.getGroup
  );
  const groupList = groupIds
    .map((groupId) => getGroup(groupId))
    .filter((group) => group !== undefined);

  return !isNoMinutes && isGroupHydrated ? (
    <div className="flex flex-col items-end justify-center mt-1">
      {groupList.map((group, index) => (
        <div
          key={index}
          className="flex items-center justify-center round rounded-full bg-orange-600 p-1 mt-1"
        >
          <div className="round rounded-full bg-white text-orange-600 h-6 w-6 flex items-center justify-center mr-2">
            <Folder sx={{ fontSize: "0.75rem" }} />
          </div>
          <div className="text-white mr-2">{group.name}</div>
        </div>
      ))}
    </div>
  ) : (
    <></>
  );
};
