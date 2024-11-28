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
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Edge,
  getNodesBounds,
  MarkerType,
  Node,
  OnConnect,
  OnEdgesChange,
  OnNodeDrag,
  OnNodesChange,
  OnNodesDelete,
  Viewport,
} from "@xyflow/react";
import { create } from "zustand";

import { subscribeWithSelector } from "zustand/middleware";
import { Message } from "../../../main/agent/agentManagerDefinition.js";
import { AgendaNode } from "../flowComponent/node/AgendaNode.jsx";
import {
  AssistantMessageNode,
  AssistantMessageNodeParam,
  removeAssistantMessage,
} from "../flowComponent/node/AssistantMessageNode.jsx";
import {
  ContentNode,
  ContentNodeParam,
  removeContent,
} from "../flowComponent/node/ContentNode.jsx";
import { DiscussionNode } from "../flowComponent/node/DisscussionNode.jsx";
import { TopicHeaderNode } from "../flowComponent/node/TopicHeaderNode.jsx";
import {
  isTopicNode,
  removeTopic,
  TopicNode,
  TopicNodeParam,
} from "../flowComponent/node/TopicNode.jsx";
import { Topic } from "../topic/Topic.js";
import { Content } from "./Content.js";
import { Agenda, useAgendaStore } from "./useAgendaStore.jsx";
import { AssistantState, useMinutesAssistantStore } from "./useAssistantsStore.jsx";
import { useMinutesContentStore } from "./useContentStore.js";
import { Group, useMinutesGroupStore } from "./useGroupStore.jsx";
import { useVFStore } from "./useVFStore.jsx";

// ==== ReactFlow  ====

type LayoutParam = {
  initialViewPort: Viewport;
  topic: {
    width: number;
    offset: {
      x: number;
      y: number;
    };
  };
  assistant: {
    width: number;
    offset: {
      x: number;
      y: number;
    };
  };
  agenda: {
    width: number;
    offset: {
      x: number;
      y: number;
    };
  };
};

export const getLayoutParam = (): LayoutParam => {
  const offsetY = 100;
  return {
    initialViewPort: {
      x: 100,
      y: 0,
      zoom: 1,
    },
    topic: {
      width: 600,
      offset: {
        x: 100,
        y: offsetY,
      },
    },
    assistant: {
      width: 400,
      offset: {
        x: 200,
        y: offsetY,
      },
    },
    agenda: {
      width: 600,
      offset: {
        x: 200,
        y: offsetY,
      },
    },
  };
};

export type TopicBothEndsNode = TopicHeaderNode | DiscussionNode;

// # Util to declare the structure of the topic tree
const makeTopicNode = (props: { topic: Topic }): TopicNode => {
  const { topic } = props;
  return {
    id: topic.id,
    type: "topic",
    position: topic.position,
    width: getLayoutParam().topic.width,
    data: {
      content: topic,
    },
  };
};

const makeTopicHeaderNode = (): TopicHeaderNode => {
  return {
    id: "topicHeader",
    type: "topicHeader",
    position: { x: 0, y: 0 },
    width: getLayoutParam().topic.width,
    data: {},
    deletable: false,
    //selectable: false, // ここを false にすると、中身のボタンもクリックできなくなる
    draggable: false,
  };
};

const makeDiscussionNode = (): DiscussionNode => {
  return {
    id: "discussion",
    type: "discussion",
    position: { x: 0, y: 0 },
    width: getLayoutParam().topic.width,
    data: {},
    deletable: false,
    //selectable: false,
    draggable: false,
  };
};

const constructTopicTreeNodes = (props: {
  topicBothEndsNodes: Array<TopicBothEndsNode>;
  topicNodes: TopicNode[];
}): Array<TopicHeaderNode | TopicNode | DiscussionNode> => {
  return [
    props.topicBothEndsNodes[0],
    ...props.topicNodes,
    props.topicBothEndsNodes[1],
  ];
};

const makeTopicEdge = (props: {
  currentTopicId: string;
  lastTopicId: string;
}): Edge => {
  const { currentTopicId, lastTopicId } = props;
  return {
    id: `${currentTopicId}:${lastTopicId}`,
    source: lastTopicId,
    target: currentTopicId,
    deletable: false,
    sourceHandle: `bottom-${lastTopicId}`,
    targetHandle: `top-${currentTopicId}`,
    style: {
      strokeWidth: 3,
      stroke: "#94A3B8", // "#94A3B8_slate400"
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "#94A3B8",
    },
  };
};

const makeTopicEdges = (props: { nodes: Node[] }): Edge[] => {
  const { nodes } = props;
  return nodes
    .map((node, index, nodes) => {
      if (index === 0) {
        return undefined;
      }
      return makeTopicEdge({
        lastTopicId: nodes[index - 1].id ?? (index - 1).toString(),
        currentTopicId: node.id,
      });
    })
    .filter((edge) => edge !== undefined);
};

// # Assistant
const makeAssistantTreeNodes = (props: {
  startTimestamp: number;
  assistantState: AssistantState;
  message: Message;
}): AssistantMessageNode => {
  const { startTimestamp, assistantState, message } = props;
  return {
    id: message.id,
    type: "assistantMessage",
    position: message.position,
    width: getLayoutParam().assistant.width,
    data: {
      assistantConfig: assistantState.vaConfig,
      content: message,
      startTimestamp,
    },
  };
};

const makeAssistantMessageEdge = (props: {
  source: string;
  target: string;
}): Edge => {
  const { source, target } = props;
  return {
    id: `${source}:${target}`,
    source: source,
    target: target,
    deletable: false,
    sourceHandle: `right-${source}`,
    targetHandle: `left-${target}`,
    style: {
      strokeWidth: 3,
      stroke: "#94A3B8", // "#94A3B8_slate400"
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "#94A3B8",
      strokeWidth: 1,
    },
  };
};

// # Agenda

const makeAgendaNode = (props: { agenda: Agenda }): AgendaNode => {
  const { agenda } = props;
  return {
    id: agenda.id,
    type: "agenda",
    position: agenda.position,
    width: getLayoutParam().agenda.width,
    data: {
      agendaId: agenda.id,
    },
    deletable: false,
    selectable: false,
  };
};

const makeAgendaEdge = (props: { source: string; target: string }): Edge => {
  const { source, target } = props;
  return {
    id: `${source}:${target}`,
    source: source,
    target: target,
    deletable: false,
    sourceHandle: `right-${source}`,
    targetHandle: `left-${target}`,
    style: {
      strokeWidth: 2,
      stroke: "#94A3B8", // "#94A3B8_slate400"
    },
  };
};

// Content

export const makeContentNode = (props: { content: Content }): ContentNode => {
  const { content } = props;
  return {
    id: content.id,
    type: "content",
    position: content.position,
    width: content.width,
    data: {
      content,
    },
  };
};

// Types

export type VFReactflowState = {
  // # connecter for ReactFlow
  // subscribe からしか変更してはいけない
  nodes: Node[];
  edges: Edge[];

  // selected 表示管理
  selectedSequences: string[];

  // assistant 表示管理
  _assistantLocatedNodeMap: Map<
    string,
    {
      node: Node;
      assistants: Array<AssistantMessageNode>;
    }
  >;

  // # 実体
  // topics
  topicBothEndsNodes: Array<TopicBothEndsNode>;
  topicNodes: TopicNode[];
  topicTreeEdges: Edge[];

  // assistant
  assistantTreeNodes: AssistantMessageNode[];
  assistantTreeEdges: Edge[];

  // agenda
  agendaNodes: AgendaNode[];
  agendaTreeEdges: Edge[];

  // content
  contentNodes: ContentNode[];
  contentTreeEdges: Edge[];
};
type Bounds = {
  measured: {
    height: number;
    width: number;
  };
  position: {
    x: number;
    y: number;
  };
};
export type VFReactflowDispatchStore = {
  // # connecter for ReactFlow
  // 内容を変更してはならない
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  // Node manipulation
  onNodeDragStop: OnNodeDrag;
  onNodeDragStart: OnNodeDrag;
  onNodesDelete: OnNodesDelete;

  // # Util
  upsertTopicNode: (node: TopicNode) => void;
  updateAssistantAt: (targetNode: Node) => void;
  getContentImplementedNodes: () => Array<
    TopicNode | AssistantMessageNode | ContentNode
  >;
  layout: (layoutParam: LayoutParam) => void;

  // Agenda は subscribe で変更できないため
  updatedAgenda: (minutesStartTimestamp: number | null) => void;

  // selection
  getSequencedSelection: () => Array<Content | Topic | Message>;
  deselectAll: () => void;
  updateSequencedSelectionsGroup: (groups: Group[]) => void;
  updateSequencedSelectionsAgenda: (agendas: Agenda[]) => void;
};

export const DefaultVFReactflowState: VFReactflowState = {
  // connecter for ReactFlow
  // subscribe からしか変更してはいけない
  nodes: [],
  edges: [],

  // selected 表示管理
  selectedSequences: [],

  // assistant 表示管理
  _assistantLocatedNodeMap: new Map(),

  // core
  topicNodes: [],
  topicBothEndsNodes: [makeTopicHeaderNode(), makeDiscussionNode()],
  topicTreeEdges: [],
  assistantTreeNodes: [],
  assistantTreeEdges: [],

  agendaNodes: [],
  agendaTreeEdges: [],

  contentNodes: [],
  contentTreeEdges: [],
};

// VFReactflowDispatchStoreストア
export const useVFReactflowStore = create<
  VFReactflowState & VFReactflowDispatchStore
>()(
  subscribeWithSelector((set, get) => ({
    ...DefaultVFReactflowState,

    getSequencedSelection: () => {
      const result: Array<Content | Topic | Message> = [];
      get().selectedSequences.forEach((id) => {
        // content
        const contentNode = get().contentNodes.find((node) => node.id === id);
        if (contentNode) {
          result.push((contentNode.data as ContentNodeParam).content);
        }

        // topic
        const topicNode = get().topicNodes.find((node) => node.id === id);
        if (topicNode) {
          result.push((topicNode.data as TopicNodeParam).content);
        }

        // assistant
        const assistantNode = get().assistantTreeNodes.find(
          (node) => node.id === id
        );
        if (assistantNode) {
          result.push(
            (assistantNode.data as AssistantMessageNodeParam).content
          );
        }
      });
      return result;
    },

    deselectAll: () => {
      set({ selectedSequences: [] });
    },

    updateSequencedSelectionsGroup(groups) {
      const startTimestamp = useVFStore.getState().startTimestamp;
      if (!startTimestamp) return;

      get().selectedSequences.forEach((id) => {
        console.log("updateSequencedSelectionsGroup", id, groups);
        // content
        const contentNode = get().contentNodes.find((node) => node.id === id);
        if (contentNode) {
          const content = (contentNode.data as ContentNodeParam).content;
          useMinutesContentStore(startTimestamp)
            .getState()
            .setContent({
              ...content,
              groupIds: groups.map((group) => group.id),
            });
        }

        // topic
        const topicNode = get().topicNodes.find((node) => node.id === id);
        if (topicNode) {
          const topic = (topicNode.data as TopicNodeParam).content;
          useVFStore.getState().vfDispatch({
            type: "updateTopic",
            payload: {
              topic: {
                ...topic,
                groupIds: groups.map((group) => group.id),
              },
            },
          });
        }

        // assistant
        const assistantNode = get().assistantTreeNodes.find(
          (node) => node.id === id
        );
        if (assistantNode) {
          const assistant = (assistantNode.data as AssistantMessageNodeParam)
            .content;
          const assistantConfig = (
            assistantNode.data as AssistantMessageNodeParam
          ).assistantConfig;
          useMinutesAssistantStore(startTimestamp)
            .getState()
            .assistantDispatch(assistantConfig)({
              type: "updateMessage",
              payload: {
                messages: [
                  {
                    ...assistant,
                    groupIds: groups.map((group) => group.id),
                  },
                ],
              },
            });
        }
      });

      // remove unnecessary group
      useMinutesGroupStore(startTimestamp).getState().removeUnnecessaryGroup();
    },

    updateSequencedSelectionsAgenda(agendas) {
      const startTimestamp = useVFStore.getState().startTimestamp;
      if (!startTimestamp) return;

      get().selectedSequences.forEach((id) => {
        // content
        const contentNode = get().contentNodes.find((node) => node.id === id);
        if (contentNode) {
          const content = (contentNode.data as ContentNodeParam).content;
          useMinutesContentStore(startTimestamp)
            .getState()
            .setContent({
              ...content,
              agendaIds: agendas.map((agenda) => agenda.id),
            });
        }

        // topic
        const topicNode = get().topicNodes.find((node) => node.id === id);
        if (topicNode) {
          const topic = (topicNode.data as TopicNodeParam).content;
          useVFStore.getState().vfDispatch({
            type: "updateTopic",
            payload: {
              topic: {
                ...topic,
                agendaIds: agendas.map((agenda) => agenda.id),
              },
            },
          });
        }

        // assistant
        const assistantNode = get().assistantTreeNodes.find(
          (node) => node.id === id
        );
        if (assistantNode) {
          const assistant = (assistantNode.data as AssistantMessageNodeParam)
            .content;
          const assistantConfig = (
            assistantNode.data as AssistantMessageNodeParam
          ).assistantConfig;
          useMinutesAssistantStore(startTimestamp)
            .getState()
            .assistantDispatch(assistantConfig)({
              type: "updateMessage",
              payload: {
                messages: [
                  {
                    ...assistant,
                    agendaIds: agendas.map((agenda) => agenda.id),
                  },
                ],
              },
            });
        }
      });
    },

    getContentImplementedNodes: () => {
      return [
        ...get().topicNodes,
        ...get().assistantTreeNodes,
        ...get().contentNodes,
      ];
    },

    onNodesChange: (changes) => {
      set({
        topicBothEndsNodes: applyNodeChanges(
          changes,
          get().topicBothEndsNodes
        ) as Array<TopicBothEndsNode>,
        topicNodes: applyNodeChanges(changes, get().topicNodes) as TopicNode[],
        assistantTreeNodes: applyNodeChanges(
          changes,
          get().assistantTreeNodes
        ) as AssistantMessageNode[],
        //agendaNodes: applyNodeChanges(changes, get().agendaNodes),
        contentNodes: applyNodeChanges(
          changes,
          get().contentNodes
        ) as ContentNode[],
      });

      // select sequences
      changes
        .filter((change) => change.type === "select")
        .forEach((change) => {
          const selectedNode = get().nodes.find(
            (node) => node.id === change.id
          );
          if (selectedNode) {
            switch (change.selected) {
              case true:
                set({
                  selectedSequences: [...get().selectedSequences, change.id],
                });
                break;
              case false:
                set({
                  selectedSequences: get().selectedSequences.filter(
                    (id) => id !== change.id
                  ),
                });
                break;
            }
          }
        });
    },
    onEdgesChange: (changes) => {
      set({
        topicTreeEdges: applyEdgeChanges(changes, get().topicTreeEdges),
        assistantTreeEdges: applyEdgeChanges(changes, get().assistantTreeEdges),
        //agendaTreeEdges: applyEdgeChanges(changes, get().agendaTreeEdges),
        contentTreeEdges: applyEdgeChanges(changes, get().contentTreeEdges),
      });
    },
    onConnect: (connection) => {
      set({
        topicTreeEdges: addEdge(connection, get().topicTreeEdges),
        assistantTreeEdges: addEdge(connection, get().assistantTreeEdges),
        //agendaTreeEdges: addEdge(connection, get().agendaTreeEdges),
        contentTreeEdges: addEdge(connection, get().contentTreeEdges),
      });
    },
    onNodeDragStart: (event, node) => {
      console.log("onNodeDragStart", event, node);
    },
    onNodeDragStop: (event, node, nodes) => {
      updateNodePosition(node);
    },
    onNodesDelete: (nodes) => {
      console.log("onNodesDelete", nodes);
      nodes.forEach((node) => {
        switch (node.type) {
          case "topic":
            removeTopic((node.data as TopicNodeParam).content.id);
            break;
          case "assistantMessage":
            removeAssistantMessage(node.data as AssistantMessageNodeParam);
          case "content":
            removeContent(node.id);
            break;
        }
      });
    },

    // util
    upsertTopicNode: (node) => {
      set((state) => {
        const nodeIndex = state.topicNodes.findIndex((n) => n.id === node.id);
        let updatedNodes = [...state.topicNodes];
        if (nodeIndex !== -1) {
          // ノードが既に存在する場合は更新
          updatedNodes[nodeIndex] = { ...node }; // 強制更新
        } else {
          // ノードが存在しない場合は topic の最後に追加
          updatedNodes = [...state.topicNodes, node];
        }
        return { topicNodes: updatedNodes };
      });
    },

    updateAssistantAt: (targetNode) => {
      const locate = locateAssistantAt(targetNode);
      // 永続化
      locate.updatedAssistantNodes.forEach((node) => updateNodePosition(node));

      // position 更新
      const assistantTreeNodes = get().assistantTreeNodes.map((node) => {
        const located = locate.updatedAssistantNodes.find(
          (assistantNode) => assistantNode.id === node.id
        ) as AssistantMessageNode | undefined;
        return located ? located : node;
      });
      set({ assistantTreeNodes });
    },

    layout: (layoutParam) => {
      // アルゴリズム
      // Topicは TopicHeader の下に TopicNode を配置。
      // 最新のTopicNodeの下に次のTopicNodeを配置し、最後のTopicNodeの下にDiscussionNodeを配置する。
      // TopicNodeが移動されている場合には、それに連動して次のTopicNodeも移動する。
      // AssistantNodeは、SequenceIds の最終要素となっているNodeの右横に配置する。
      // 複数のAssistantNodeが同じNodeに紐づいている場合には、横に並べる。

      const topicBothEndsNodes = get().topicBothEndsNodes;
      const topicNodes = get().topicNodes;
      const assistantTreeNodes = get().assistantTreeNodes;
      const contentNodes = get().contentNodes;

      const constructTopicTree = constructTopicTreeNodes({
        topicBothEndsNodes,
        topicNodes,
      });

      // == Layout  ==
      const updatedBothEndsNodes: TopicBothEndsNode[] = [];
      const updateTopicNodes: TopicNode[] = [];
      const updatedAssistantNodes: AssistantMessageNode[] = [];

      let lastTopicGroupData = {
        measured: { height: 0, width: 0 },
        position: { x: 0, y: 0 },
      };
      constructTopicTree.forEach((topicNode) => {
        // topic の配置
        const topicLocation = locateTopic(topicNode, lastTopicGroupData);
        if (
          topicNode.type === "topicHeader" ||
          topicNode.type === "discussion"
        ) {
          updatedBothEndsNodes.push(
            topicLocation.updatedTopicNode as TopicBothEndsNode
          );
        } else {
          updateTopicNodes.push(topicLocation.updatedTopicNode as TopicNode);
        }

        updateAssistantLocatedNodeMap();

        // topic に関連する assistant の配置
        const location = locateAssistantAt(topicLocation.updatedTopicNode);
        updatedAssistantNodes.push(...location.updatedAssistantNodes);
        lastTopicGroupData = location.groupBounds;
      });

      set({
        topicBothEndsNodes: updatedBothEndsNodes,
        topicNodes: updateTopicNodes,
      });
      // topic系 position 永続化
      updateTopicNodes.forEach((node) => updateNodePosition(node));
      topicBothEndsNodes.forEach((node) => updateNodePosition(node));

      // 反映された topic の位置を元に、assistant の対象位置を更新

      // Agenda
      // locateAgenda();

      // Assistant location
      // Content
      contentNodes.forEach((contentNode) =>
        updatedAssistantNodes.push(
          ...locateAssistantAt(contentNode).updatedAssistantNodes
        )
      );
      // Assistant connected Assistant
      assistantTreeNodes.forEach((assistantNode) =>
        updatedAssistantNodes.push(
          ...locateAssistantAt(assistantNode).updatedAssistantNodes
        )
      );

      // == Update ==
      updatedAssistantNodes.forEach((node) => updateNodePosition(node));

      // 表示変更
      set({
        assistantTreeNodes: updatedAssistantNodes,
        contentNodes: contentNodes,
      });
    },

    // agenda
    updatedAgenda: (minutesStartTimestamp) => {
      if (!minutesStartTimestamp) return;
      // agenda node
      const agendaNodes = useAgendaStore
        .getState()
        .getAllAgendas()
        .filter((agenda) => agenda.status !== "waiting")
        .map((agenda) => makeAgendaNode({ agenda }));

      // agenda edge
      // topic を軸にして、agenda を結ぶ
      const agendaTreeEdges: Edge[] = [];
      useVFStore.getState().topics.forEach((topic) => {
        if (topic.seedData?.agendaIdList) {
          topic.seedData.agendaIdList.forEach((agendaId) => {
            if (agendaNodes.find((node) => node.data.agendaId === agendaId)) {
              const edgeNode = makeAgendaEdge({
                source: agendaId,
                target: topic.id,
              });
              if (!agendaTreeEdges.find((edge) => edge.id === edgeNode.id)) {
                agendaTreeEdges.push(
                  makeAgendaEdge({
                    source: agendaId,
                    target: topic.id,
                  })
                );
              }
            }
          });
        }
      });

      console.log(
        "useVFReactFlowStore: updatedAgenda",
        agendaNodes,
        agendaTreeEdges
      );
      //set({ agendaNodes, agendaTreeEdges });
    },
  }))
);

// ==== VFStore Subscriber ====

// # util

// assistant 毎に配置すべきNodeを取得
const updateAssistantLocatedNodeMap = () => {
  const assistantTreeNodes = useVFReactflowStore.getState()
    .assistantTreeNodes as AssistantMessageNode[];
  const _assistantLastNodeMap: Map<string, Node> = new Map();
  assistantTreeNodes.forEach((assistantNode) => {
    // Assistantは紐づく最後のNodeに配置する
    // Assistant が connectedMessageIds を持っていないことは、運用上ありえないはず
    if (assistantNode.data.content.connectedMessageIds.length > 0) {
      _assistantLastNodeMap.set(
        assistantNode.id,
        useVFReactflowStore
          .getState()
          .nodes.filter(
            (node) =>
              node.id === assistantNode.data.content.connectedMessageIds.at(-1)
          )[0]
      );
    }
  });

  // 複数のAssistantが同じNodeに紐づいている場合には、横に並べる。
  const assistantLocatedNodeMap: Map<
    string,
    {
      node: Node;
      assistants: Array<AssistantMessageNode>;
    }
  > = new Map();
  assistantTreeNodes.forEach((assistantNode) => {
    const assistantLocatedNode = _assistantLastNodeMap.get(assistantNode.id);
    if (assistantLocatedNode) {
      const group = assistantLocatedNodeMap.get(assistantLocatedNode.id);
      if (group) {
        group.assistants.push(assistantNode);
      } else {
        assistantLocatedNodeMap.set(assistantLocatedNode.id, {
          node: assistantLocatedNode,
          assistants: [assistantNode],
        });
      }
    }
  });

  useVFReactflowStore.setState({
    _assistantLocatedNodeMap: assistantLocatedNodeMap,
  });
};

const updateTopicNode = (props: { targetTopic: Topic }) => {
  const { targetTopic } = props;
  const storedTopicNode = useVFReactflowStore
    .getState()
    .nodes.find(
      (node) => isTopicNode(node) && node.data.content.id === targetTopic.id
    ) as TopicNode | undefined;
  if (storedTopicNode) {
    storedTopicNode.data.content = targetTopic;
    useVFReactflowStore.getState().upsertTopicNode(storedTopicNode);
    console.log("updateTopicNode", storedTopicNode);
  }
};

const initTopicTree = (props: { topics: Topic[] }) => {
  const { topics } = props;

  // == 1. Construct ==
  const topicNodes = topics.map((topic) => makeTopicNode({ topic }));
  useVFReactflowStore.setState({
    topicNodes,
    topicTreeEdges: makeTopicEdges({
      nodes: constructTopicTreeNodes({
        topicNodes,
        topicBothEndsNodes: useVFReactflowStore.getState().topicBothEndsNodes,
      }),
    }),
  });

  // update header and discussion position
  relocateTopicBothEndsNodes();
};

const updateNodePosition = (node: Node) => {
  const startTimestamp = useVFStore.getState().startTimestamp;
  if (!startTimestamp) return;
  switch (node.type) {
    case "topic":
      useVFStore.getState().vfDispatch({
        type: "updateTopic",
        payload: {
          topic: {
            ...(node as TopicNode).data.content,
            position: {
              x: node.position.x,
              y: node.position.y,
            },
          },
        },
      });
      break;
    case "agenda":
      const targetAgenda = useAgendaStore
        .getState()
        .getAgenda((node as AgendaNode).data.agendaId);
      if (!targetAgenda) return;
      useAgendaStore.getState().setAgenda({
        ...targetAgenda,
        position: node.position,
      });
      break;
    case "assistantMessage":
      const assistantState =
        useMinutesAssistantStore(startTimestamp).getState();
      if (!assistantState._hasHydrated) return;

      console.log("onNodeDragStop: assistantMessage", node.data);
      const assistantDispatch = assistantState.assistantDispatch(
        (node as AssistantMessageNode).data.assistantConfig
      );
      assistantDispatch({
        type: "updateMessage",
        payload: {
          messages: [
            {
              ...(node as AssistantMessageNode).data.content,
              position: {
                x: node.position.x,
                y: node.position.y,
              },
            },
          ],
        },
      });
      break;
    case "content":
      const useContent = useMinutesContentStore(startTimestamp);
      const content = useContent.getState().getContent(node.id);
      if (!content) return;
      useContent.getState().setContent({
        ...content,
        position: node.position,
      });
      break;
  }
};

const locateTopic = (
  targetNode: TopicNode | TopicBothEndsNode,
  lastBounds: Bounds
): {
  updatedTopicNode: TopicNode | TopicBothEndsNode;
  bounds: Bounds;
} => {
  // 直前の topicNode の下に配置
  const topicLayout = getLayoutParam().topic;
  targetNode.position = {
    x:
      /*
      -(targetNode.measured && targetNode.measured.width
        ? targetNode.measured.width
        : 0) /
      2 +
      */
      topicLayout.offset.x,
    y:
      lastBounds.position.y + lastBounds.measured.height + topicLayout.offset.y,
  };
  const updatedTopicNode = { ...targetNode }; // 更新したので新オブジェクトを返す
  return {
    updatedTopicNode,
    bounds: {
      measured: {
        height: updatedTopicNode.measured?.height ?? 0,
        width: updatedTopicNode.measured?.width ?? 0,
      },
      position: updatedTopicNode.position,
    },
  };
};

const locateAssistantAt = (
  targetNode: Node
): {
  updatedAssistantNodes: AssistantMessageNode[];
  groupBounds: Bounds;
} => {
  // 表示すべきAssistant がある場合
  // 直系のAssistantは Node の右の1列目に、横方向に並べる。重ねないように！
  let groupBounds = getNodesBounds([targetNode]);
  let updatedAssistantNodes: AssistantMessageNode[] = [];
  const assistantGroup = useVFReactflowStore
    .getState()
    ._assistantLocatedNodeMap.get(targetNode.id);
  if (assistantGroup) {
    let lastAssistantData = {
      measured: { height: 0, width: getLayoutParam().assistant.width },
      position: {
        x:
          targetNode.position.x +
          (targetNode.measured?.width ?? getLayoutParam().assistant.width) +
          getLayoutParam().assistant.offset.x,
        y: targetNode.position.y,
      },
    };
    assistantGroup.assistants.forEach((assistant, index) => {
      assistant.position = {
        x:
          lastAssistantData.position.x +
          lastAssistantData.measured.width +
          (index > 0 ? getLayoutParam().assistant.offset.x : 0),
        y:
          lastAssistantData.position.y +
          (index > 0 ? getLayoutParam().assistant.offset.y : 0),
      };
      updatedAssistantNodes.push({ ...assistant }); // 更新したので新オブジェクトを返す
      lastAssistantData = {
        ...lastAssistantData,
        position: assistant.position,
      };
      if (
        assistant.measured &&
        assistant.measured.height &&
        assistant.measured.width
      ) {
        lastAssistantData = {
          ...lastAssistantData,
          measured: {
            height: assistant.measured.height,
            width: assistant.measured.width,
          },
        };
      }
    });

    // topic node group 全体の大きさを更新
    groupBounds = getNodesBounds([
      assistantGroup.node,
      ...assistantGroup.assistants.map((assistant) => assistant),
    ]);
  }
  return {
    updatedAssistantNodes: updatedAssistantNodes,
    groupBounds: {
      measured: {
        height: groupBounds.height,
        width: groupBounds.width,
      },
      position: { x: groupBounds.x, y: groupBounds.y },
    },
  };
};

const locateAgenda = () => {
  const layoutParam = getLayoutParam();
  const agendaNodes = useVFReactflowStore.getState().agendaNodes;
  const updateAgendaNodes: AgendaNode[] = [];
  agendaNodes.forEach((agendaNode, index) => {
    const agendaFirstTopicNode = useVFReactflowStore
      .getState()
      .topicNodes.find((topicNode) =>
        useVFStore
          .getState()
          .topics.find((topic) => topic.id === topicNode.id)
          ?.seedData?.agendaIdList?.includes(agendaNode.id)
      );

    if (agendaFirstTopicNode) {
      // topic に確定的に結びついた agenda
      agendaNode.position = {
        x:
          agendaFirstTopicNode.position.x -
          layoutParam.agenda.width -
          layoutParam.agenda.offset.x,
        y: agendaFirstTopicNode.position.y,
      };

      // 前の agenda の位置に被らないかを確認
      if (index > 0) {
        const lastAgendaNode = agendaNodes[index - 1];
        if (lastAgendaNode.position.y === agendaNode.position.y) {
          agendaNode.position = {
            x: lastAgendaNode.position.x,
            y: lastAgendaNode.position.y + layoutParam.agenda.offset.y,
          };
        }
      }
    } else {
      // まだ topic に確定的に結びついていない agenda
      // discussion node の左に配置
      const discussionNode =
        useVFReactflowStore.getState().topicBothEndsNodes[1]; // discussion node は必ず存在する
      if (discussionNode) {
        agendaNode.position = {
          x:
            discussionNode.position.x -
            layoutParam.agenda.width -
            layoutParam.agenda.offset.x,
          y: discussionNode.position.y,
        };
      }
    }
    updateAgendaNodes.push({ ...agendaNode });
    updateNodePosition(agendaNode); // 永続化
  });
  useVFReactflowStore.setState({ agendaNodes: updateAgendaNodes });
};

// === Subscribe ===
useVFReactflowStore.subscribe((current, pre) => {
  if (
    current.topicNodes !== pre.topicNodes ||
    current.assistantTreeNodes !== pre.assistantTreeNodes ||
    current.agendaNodes !== pre.agendaNodes ||
    current.contentNodes !== pre.contentNodes
  ) {
    // ノードの変更を検知して、トピックツリーを再構築
    useVFReactflowStore.setState({
      nodes: [
        ...constructTopicTreeNodes({
          topicBothEndsNodes: useVFReactflowStore.getState().topicBothEndsNodes,
          topicNodes: useVFReactflowStore.getState().topicNodes,
        }),
        ...useVFReactflowStore.getState().assistantTreeNodes,
        ...useVFReactflowStore.getState().agendaNodes,
        ...useVFReactflowStore.getState().contentNodes,
      ],
      edges: [
        ...useVFReactflowStore.getState().topicTreeEdges,
        ...useVFReactflowStore.getState().assistantTreeEdges,
        ...useVFReactflowStore.getState().agendaTreeEdges,
      ],
    });
  }
});

// VFStore
export const relocateTopicBothEndsNodes = () => {
  const topicNodes = useVFReactflowStore.getState().topicNodes;
  const topicBothEndsNodes = useVFReactflowStore.getState().topicBothEndsNodes;
  let updatedHeaderNode;
  let updatedDiscussionNode;
  if (topicNodes.length > 0) {
    updatedHeaderNode = {
      ...topicBothEndsNodes[0],
      position: {
        x: topicNodes[0].position.x,
        y: topicNodes[0].position.y - 100,
      },
    };
    updatedDiscussionNode = {
      ...topicBothEndsNodes[1],
      position: {
        x: topicNodes[topicNodes.length - 1].position.x,
        y:
          topicNodes[topicNodes.length - 1].position.y +
          (topicNodes[topicNodes.length - 1].measured?.height ?? 300) + // 最終Nodeの高さが計測前の場合には、ダミーとする
          100,
      },
    };
  } else {
    updatedHeaderNode = {
      ...topicBothEndsNodes[0],
      position: {
        x: topicBothEndsNodes[0].position.x,
        y: 0,
      },
    };
    updatedDiscussionNode = {
      ...topicBothEndsNodes[1],
      position: {
        x: topicBothEndsNodes[1].position.x,
        y: 100,
      },
    };
  }

  useVFReactflowStore.setState({
    topicBothEndsNodes: [
      updatedHeaderNode ?? topicBothEndsNodes[0],
      updatedDiscussionNode ?? topicBothEndsNodes[1],
    ],
  });
};

// dispatch post process
useVFStore.subscribe(
  (state) => state.lastAction,
  (lastAction) => {
    (async () => {
      switch (lastAction?.type) {
        // トピックの追加・削除・変更
        case "updateTopic":
          useVFReactflowStore.setState({
            topicNodes: useVFReactflowStore
              .getState()
              .topicNodes.map((node) =>
                node.id === lastAction.payload.topic.id
                  ? makeTopicNode({ topic: lastAction.payload.topic })
                  : node
              ),
          });
          relocateTopicBothEndsNodes();
          break;
        case "setTopic":
          const topicNodes = [...useVFReactflowStore.getState().topicNodes]; // ここにはまだ新しいNodeが追加されていない
          let lastNode =
            topicNodes.length > 0
              ? topicNodes[topicNodes.length - 1]
              : useVFReactflowStore.getState().topicBothEndsNodes[0];
          let lastBounds = {
            measured: {
              height: lastNode.measured?.height ?? 0,
              width: lastNode.measured?.width ?? 0,
            },
            position: lastNode.position,
          };

          for (const topic of lastAction.payload.topics) {
            const located = locateTopic(makeTopicNode({ topic }), lastBounds);
            topicNodes.push(located.updatedTopicNode as TopicNode); // 上でTopicから生成したNodeを使うため
            useVFReactflowStore.setState({ topicNodes });
            updateNodePosition(located.updatedTopicNode); // 変更を永続化
            lastBounds = located.bounds;
            // FIXME：　ここで wait して measure が取得できるようにしないと、次の topic の位置がずれる
          }

          // topic tree edge
          useVFReactflowStore.setState({
            topicTreeEdges: makeTopicEdges({
              nodes: constructTopicTreeNodes({
                topicNodes,
                topicBothEndsNodes:
                  useVFReactflowStore.getState().topicBothEndsNodes,
              }),
            }),
          });

          // update header and discussion position
          relocateTopicBothEndsNodes();

          // agenda
          useVFReactflowStore
            .getState()
            .updatedAgenda(useVFStore.getState().startTimestamp);
          //locateAgenda();
          break;
        // トピックツリーの初期化
        case "openHomeMenu": // ホームメニューが開かれた場合、トピックツリーを再描画
        case "createNewMinutes": //　minutes 作成時
        case "openMinutes": // minutes open時
        case "deleteAllTopic": // minutes 再構築時
        case "removeTopic": // topic 削除時
          console.log("useVFReactflowStore: topicTree & agenda: init: 0");
          // topic
          useVFReactflowStore.setState({ ...DefaultVFReactflowState });
          initTopicTree({ topics: useVFStore.getState().topics });
          // agenda
          useVFReactflowStore
            .getState()
            .updatedAgenda(useVFStore.getState().startTimestamp);
          console.log("useVFReactflowStore: topicTree: agenda: init: 1");
          break;
        // トピックの選択
        case "selectTopic":
          const selectedTopic = useVFStore
            .getState()
            .topics.find((topic) => topic.id === lastAction.payload.topicID);
          if (selectedTopic) {
            updateTopicNode({
              targetTopic: selectedTopic,
            });
          }
          break;
        // トピックの選択解除
        case "selectAllTopic":
        case "deselectAllTopic":
          useVFStore.getState().topics.forEach((topic, index) => {
            updateTopicNode({
              targetTopic: topic,
            });
          });
          break;
        default:
          break;
      }
    })();
  }
);

// Assistant
const updateAssistantNodes = ({
  startTimestamp,
  assistantsMap,
}: {
  startTimestamp: number | undefined;
  assistantsMap: Map<string, AssistantState>;
}) => {
  if (startTimestamp && startTimestamp > 0) {
    const assistantTreeNodes = Array.from(assistantsMap.values()).flatMap(
      (assistantState) =>
        (assistantState.messages ?? []).map((message) =>
          makeAssistantTreeNodes({
            assistantState,
            message,
            startTimestamp,
          })
        )
    );

    const assistantTreeEdges = assistantTreeNodes.flatMap(
      (assistantMessageNode) =>
        assistantMessageNode.data.content.connectedMessageIds.map((messageId) =>
          makeAssistantMessageEdge({
            source: messageId,
            target: assistantMessageNode.id,
          })
        )
    );

    // 更新
    useVFReactflowStore.setState({
      assistantTreeNodes,
      assistantTreeEdges,
    });
  }
};

let unsubscribeAssistantStore: (() => void) | null = null;
useVFStore.subscribe(
  (state) => state.startTimestamp,
  async (startTimestamp) => {
    // content node
    if (startTimestamp) {
      // 1. 初期状態を手動で取得してノードをセット
      console.log("useVFReactflowStore: updatedAssistant: init");
      updateAssistantNodes({
        startTimestamp,
        assistantsMap:
          useMinutesAssistantStore(startTimestamp).getState().assistantsMap,
      });

      // 2. contentMap に変化があった場合に購読して更新
      if (unsubscribeAssistantStore) {
        unsubscribeAssistantStore();
      }
      unsubscribeAssistantStore = useMinutesAssistantStore(
        startTimestamp
      ).subscribe(
        (state) => state.assistantsMap,
        (assistantsMap, assistantPreMap) => {
          // assistant node すべてを再構築
          updateAssistantNodes({ startTimestamp, assistantsMap });
          updateAssistantLocatedNodeMap();
          //　レイアウト処理は subscribe で行う
        },
        {
          equalityFn: (a, b) => {
            return (
              // 1. Map のサイズが同じかどうか
              a.size === b.size &&
              Array.from(a).every(([key, value]) => b.has(key)) &&
              // 2. 各要素のmessageが同じかどうか。 Node生成後の変更は考慮しない
              Array.from(a).every(([key, value]) => {
                const target = b.get(key);
                if (target) {
                  return (
                    value.messages &&
                    target.messages &&
                    value.messages.length === target.messages.length &&
                    value.messages.every((message, index) => {
                      const targetMessage = target.messages![index];
                      return (
                        message.id === targetMessage.id &&
                        message.content === targetMessage.content &&
                        message.connectedMessageIds.length ===
                        targetMessage.connectedMessageIds.length &&
                        message.connectedMessageIds.every(
                          (id, index) =>
                            id === targetMessage.connectedMessageIds[index]
                        ) &&
                        Array.isArray(message.groupIds) &&
                        Array.isArray(targetMessage.groupIds) &&
                        message.groupIds.length ===
                        targetMessage.groupIds.length &&
                        message.groupIds.every(
                          (id, index) => id === targetMessage.groupIds[index]
                        )
                      );
                    })
                  );
                }
                return false;
              })
            );
          },
        }
      );
    }
  }
);

// assistant message Node 自動配置
useVFReactflowStore.subscribe(
  (state) => state.assistantTreeNodes,
  (assistantTreeNodes, preAssistantTreeNodes) => {
    // topic
    assistantTreeNodes
      .filter((node) => !!node.measured)
      .filter(
        (node) =>
          !!preAssistantTreeNodes.find(
            (preNode) =>
              preNode.id === node.id && preNode.measured === undefined
          )
      )
      // 位置が原点のものが未配置の可能性あり
      .filter((node) => node.position.x === 0 && node.position.y == 0)
      // 対象に
      .forEach((node) => {
        const message = (node as AssistantMessageNode).data.content;
        if (message.connectedMessageIds.length > 0) {
          const targetNode = useVFReactflowStore
            .getState()
            .nodes.find(
              (node) =>
                node.id ===
                message.connectedMessageIds[
                message.connectedMessageIds.length - 1
                ]
            );
          if (targetNode) {
            // 対象Node　の右に配置して
            useVFReactflowStore.getState().updateAssistantAt(targetNode);
          }
        }
      });
  },
  {
    equalityFn: (a, b) => {
      return (
        a.length === b.length &&
        a.every(
          (node, index) =>
            node.id === b[index].id && node.measured === b[index].measured
        )
      );
    },
  }
);

// Agenda
// agenda の変更を検知して、agenda node を再構築
// 注意： agenda の get は感知しないので、そちらは VFStore 側で処理する
useAgendaStore.subscribe(
  (state) => {
    return {
      agendas: state.getAllAgendas(),
      discussingAgenda: state.getDiscussingAgenda(),
      hydrate: state._hasHydrated,
    };
  },
  (assistantsMap) => {
    // agenda node
    //console.log("useAgendaStore.subscribe: changed", assistantsMap);
    useVFReactflowStore
      .getState()
      .updatedAgenda(useVFStore.getState().startTimestamp);
  },
  {
    equalityFn: (a, b) => {
      const isSameHydrate = a.hydrate === b.hydrate;
      const isSameDiscussingAgenda =
        (a.discussingAgenda == undefined && b.discussingAgenda == undefined) ||
        (a.discussingAgenda != undefined &&
          b.discussingAgenda != undefined &&
          a.discussingAgenda.agendaId === b.discussingAgenda.agendaId &&
          a.discussingAgenda.startUTC === b.discussingAgenda.startUTC);
      const isSameAgendas =
        a.agendas.length === b.agendas.length &&
        a.agendas.every((agenda) => {
          const target = b.agendas.find((bAgenda) => bAgenda.id === agenda.id);
          if (target) {
            return (
              agenda.title === target.title &&
              agenda.classification === target.classification &&
              agenda.category === target.category &&
              agenda.status === target.status &&
              // FIXME
              agenda.discussedTimes.length === target.discussedTimes.length
            );
          }
          return false;
        });
      return isSameHydrate && isSameDiscussingAgenda && isSameAgendas;
    },
  }
);

// Content
// content の変更を検知して、content node を再構築

let unsubscribeContentStore: (() => void) | null = null;
useVFStore.subscribe(
  (state) => state.startTimestamp,
  (startTimestamp) => {
    // content node
    if (startTimestamp && startTimestamp > 0) {
      // 1. 初期状態を手動で取得してノードをセット
      useVFReactflowStore.setState({
        contentNodes: Array.from(
          useMinutesContentStore(startTimestamp).getState().contentMap.values()
        ).map((content) => makeContentNode({ content })),
      });

      // 2. contentMap に変化があった場合に購読して更新
      if (unsubscribeContentStore) {
        // 既存の購読があれば一度解除する
        unsubscribeContentStore();
      }
      unsubscribeContentStore = useMinutesContentStore(
        startTimestamp
      ).subscribe(
        (state) => state.contentMap,
        (state) => {
          useVFReactflowStore.setState({
            contentNodes: Array.from(state.values()).map((content) =>
              makeContentNode({ content })
            ),
          });
        },
        {
          equalityFn: (a, b) => {
            return (
              a.size === b.size &&
              Array.from(a).every(
                ([key, value]) =>
                  b.has(key) &&
                  value.id === b.get(key)?.id &&
                  value.type === b.get(key)?.type &&
                  value.width === b.get(key)?.width &&
                  value.position &&
                  b.get(key)?.position &&
                  value.position.x &&
                  b.get(key)?.position.x &&
                  value.position.y &&
                  b.get(key)?.position.y &&
                  Array.isArray(value.groupIds) &&
                  Array.isArray(b.get(key)?.groupIds) &&
                  value.groupIds.length === b.get(key)?.groupIds.length &&
                  value.groupIds.every(
                    (groupId) =>
                      b.get(key)?.groupIds.includes(groupId) &&
                      value.groupIds.includes(groupId)
                  )
              )
            );
          },
        }
      );
    }
  }
);
