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
import { useEffect, useState } from "react";
import { GENERAL_ASSISTANT_NAME } from "../../../../common/agentManagerDefinition.js";
import { AgendaSelectorDialogBody } from "../../agenda/AgendaSelector.jsx";
import { AIAssistantAvatar } from "../../assistant/message/AIAssistantAvatar.jsx";
import { useDetailViewDialog } from "../../common/useDetailViewDialog.jsx";
import { GroupSelectorDialogBody } from "../../group/GroupSelector.jsx";
import { Agenda, useAgendaStore } from "../../store/useAgendaStore.jsx";
import {
  AssistantState,
  makeInvokeParam,
  useMinutesAssistantStore,
  VirtualAssistantConf,
} from "../../store/useAssistantsStore.jsx";
import { useMinutesGroupStore } from "../../store/useGroupStore.jsx";
import { useVFReactflowStore } from "../../store/useVFReactflowStore.jsx";
import { useVBStore } from "../../store/useVBStore.jsx";
import { AssistantMessageNode } from "./AssistantMessageNode.jsx";
import { ContentNode } from "./ContentNode.jsx";
import { TopicNode } from "./TopicNode.jsx";
import { useMinutesStore } from "../../store/useMinutesStore.jsx";

export const NodeBase = (props: {
  nodeProps: NodeProps<TopicNode | AssistantMessageNode | ContentNode>;
  children: React.ReactNode;
}) => {
  const { nodeProps } = props;
  const startTimestamp = useVBStore().startTimestamp;
  const minutesStore = useMinutesStore(startTimestamp).getState();

  // selectedSequence
  const cssStyle = nodeProps.selected
    ? "relative border-4 border-green-500"
    : "relative";
  const selectedSequenceIndex = useVFReactflowStore(
    (state) => state.selectedSequences
  ).findIndex((seq) => seq === nodeProps.id);

  const selectedSequence =
    selectedSequenceIndex > -1 ? (
      <div
        style={{
          position: "absolute",
          top: "-1rem",
          left: "-1rem",
          zIndex: 10, // 子要素よりも上に表示されるようにz-indexを設定
        }}
      >
        <div className="rounded-full bg-green-500 text-white w-8 h-8 flex justify-center items-center">
          <span>{selectedSequenceIndex + 1}</span>
        </div>
      </div>
    ) : null;

  const isLastSelected = useVFReactflowStore(
    (state) =>
      state.selectedSequences[state.selectedSequences.length - 1] ===
      nodeProps.id
  );

  // assistant
  const assistants = minutesStore.assistants.filter(
    (assistant) =>
      assistant.assistantId !== GENERAL_ASSISTANT_NAME &&
      assistant.updateMode === "manual"
  );

  // agendaList
  const agendaList = (props.nodeProps.data.content.agendaIds ?? []) // 過渡期のためのデータ変換
    .map((agendaId) => useAgendaStore.getState().getAgenda(agendaId))
    .filter((agenda) => agenda !== undefined);

  // change group
  const { detailViewDialog, renderDetailViewDialog, handleClose } =
    useDetailViewDialog();

  const handleGroup = (event: any) => {
    if (!startTimestamp) return;
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
    if (!startTimestamp) return;
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
          className="w-full h-0" // h-0 で高さのプロパティを定義しないと absolute は効かない
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            zIndex: 10, // 子要素よりも上に表示されるようにz-indexを設定
          }}
        >
          <div className="flex justify-between items-start">
            <BelongAgendaChips agendaList={agendaList} />
            {startTimestamp && (
              <BelongGroupChips
                minutesStartTimestamp={startTimestamp}
                groupIds={nodeProps.data.content.groupIds ?? []}
              />
            )}
          </div>
        </div>
      </div>

      {renderDetailViewDialog()}
    </>
  );
};

const AssistantButton = (props: { assistantConfig: VirtualAssistantConf }) => {
  const { assistantConfig } = props;
  const minutesStartTimestamp = useVBStore().startTimestamp;

  // 状態とフック呼び出しを外に出し、後続処理で条件付きで使用
  const assistantStore = minutesStartTimestamp
    ? useMinutesAssistantStore(minutesStartTimestamp)
    : null;

  const [state, setState] = useState<AssistantState | undefined>(undefined);

  useEffect(() => {
    // minutesStartTimestamp がない場合は終了
    if (
      !minutesStartTimestamp ||
      !assistantStore ||
      !assistantStore.getState()._hasHydrated
    )
      return;

    //console.log("AssistantButton: useEffect", state);
    setState(assistantStore.getState().getOrInitAssistant(assistantConfig));

    // onProcessの変化を監視して再レンダリングをトリガー
    const unsubscribe = assistantStore.subscribe(
      (state) =>
        state.assistantsMap.get(assistantConfig.assistantId)?.onProcess,
      (onProcess) => {
        if (onProcess !== undefined) {
          setState((prevState) => ({
            ...prevState!,
            onProcess: onProcess,
          }));

          if (!onProcess) {
            // deselect all
            useVFReactflowStore.getState().deselectAll();
          }
        }
      }
    );

    return () => unsubscribe(); // クリーンアップ
  }, [minutesStartTimestamp, assistantConfig, assistantStore]);

  const handleAssistantButtonClick = () => {
    if (!state || !assistantStore || !assistantStore.getState()._hasHydrated)
      return;

    assistantStore.getState().assistantDispatch(assistantConfig)({
      type: "invokeAssistant",
      payload: {
        queue: [
          makeInvokeParam({
            basePrompt: assistantConfig.aiConfig.systemPrompt,
            messages: useVFReactflowStore.getState().getSequencedSelection(),
            attachOption: assistantConfig.attachOption ?? {
              attachment: "topic",
              target: "manualSelected",
            },
          }),
        ],
      },
    });
  };

  return minutesStartTimestamp ? (
    <Button
      value={assistantConfig.assistantId}
      className="min-w-0 min-h-0 p-1 text-white border-white bg-sky-900 disabled:text-white/25"
      onClick={handleAssistantButtonClick}
      disabled={!state || state.onProcess}
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

const BelongGroupChips = (props: {
  minutesStartTimestamp: number;
  groupIds: string[];
}) => {
  const { minutesStartTimestamp, groupIds } = props;

  const getGroup = useMinutesGroupStore(minutesStartTimestamp)(
    (state) => state.getGroup
  );
  const groupList = groupIds
    .map((groupId) => getGroup(groupId))
    .filter((group) => group !== undefined);

  // Hydration の完了を監視
  const isHydrated = useMinutesGroupStore(minutesStartTimestamp)(
    (state) => state._hasHydrated
  );
  const [hydrated, setHydrated] = useState(isHydrated);
  useEffect(() => {
    if (!isHydrated) {
      const unsubscribe = useMinutesGroupStore(minutesStartTimestamp).subscribe(
        (state) => state._hasHydrated,
        (newHydrated) => {
          if (newHydrated) {
            setHydrated(true);
            unsubscribe();
          }
        }
      );
    } else {
      setHydrated(true);
    }
  }, [isHydrated, minutesStartTimestamp]);

  return hydrated ? (
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
