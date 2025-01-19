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
import { Message } from "../../../../common/content/assisatant.js";
import {
  AssistantMessageNode,
  AssistantMessageNodeParam,
} from "../../flowComponent/node/AssistantMessageNode.jsx";
import { ContentNode } from "../../flowComponent/node/ContentNode.jsx";
import { DiscussionNode } from "../../flowComponent/node/DisscussionNode.jsx";
import { TopicHeaderNode } from "../../flowComponent/node/TopicHeaderNode.jsx";
import {
  isTopicNode,
  TopicNode,
  TopicNodeParam,
} from "../../flowComponent/node/TopicNode.jsx";
import { Topic } from "../../../../common/content/topic.js";
import { Content } from "../../../../common/content/content.js";
import {
  AssistantState,
  useMinutesAssistantStore,
  VirtualAssistantConf,
} from "../useAssistantsStore.jsx";
import { useMinutesContentStore } from "../useContentStore.jsx";
import { Group, useMinutesGroupStore } from "../useGroupStore.jsx";
import { useVBStore } from "../useVBStore.jsx";
import { useMinutesStore } from "../useMinutesStore.jsx";
import { processTopicAction } from "../../action/TopicAction.js";
import { Agenda } from "../../../../common/content/agenda.js";
import { processAssistantMessageAction } from "../../action/AssistantMessageAction.js";
import { processContentAction } from "../../action/ContentAction.js";

// ==== ReactFlow  ====
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
};

export const getLayoutParam = (): LayoutParam => {
  const offsetY = 100;
  return {
    initialViewPort: {
      x: 100,
      y: 100,
      zoom: 1.0,
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
        x: 100,
        y: offsetY,
      },
    },
  };
};

export type TopicBothEndsNode = TopicHeaderNode | DiscussionNode;

export type VBReactflowState = {
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
  // layout
  _layoutTopicsQueue: Array<TopicNode>;
  lastAppendedNodes: Node[];
  lastViewport: Viewport;

  // topics
  topicBothEndsNodes: Array<TopicBothEndsNode>;
  topicNodes: TopicNode[];
  topicEdges: Edge[];

  // assistant
  assistantNodes: AssistantMessageNode[];
  assistantEdges: Edge[];

  // content
  contentNodes: ContentNode[];
  contentEdges: Edge[];
};

const DefaultVBReactflowState: VBReactflowState = {
  // # connecter for ReactFlow --
  // These properties should not be updated directly.
  nodes: [],
  edges: [],
  // ---

  // layout
  lastAppendedNodes: [],
  lastViewport: getLayoutParam().initialViewPort,
  _layoutTopicsQueue: [],

  // selected 表示管理
  selectedSequences: [],

  // assistant 表示管理
  _assistantLocatedNodeMap: new Map(),

  // core
  topicNodes: [],
  topicBothEndsNodes: [
    {
      id: "topicHeader",
      type: "topicHeader",
      position: { x: 0, y: 0 },
      width: getLayoutParam().topic.width,
      data: {},
      deletable: false,
      //selectable: false, // if false, the button inside cannot be clicked.
      draggable: false,
    },
    {
      id: "discussion",
      type: "discussion",
      position: { x: 0, y: 0 },
      width: getLayoutParam().topic.width,
      data: {},
      deletable: false,
      //selectable: false,
      draggable: false,
    },
  ],
  topicEdges: [],
  assistantNodes: [],
  assistantEdges: [],

  contentNodes: [],
  contentEdges: [],
};

export type VBReactflowDispatchStore = {
  // # connecter for ReactFlow --
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  // ## Node manipulation
  onNodeDragStop: OnNodeDrag;
  onNodeDragStart: OnNodeDrag;
  onNodesDelete: OnNodesDelete;
  // ---

  // # Util
  upsertTopicNode: (node: TopicNode) => void;
  updateAssistantAt: (targetNode: Node) => void;
  getContentImplementedNodes: () => Array<
    TopicNode | AssistantMessageNode | ContentNode
  >;
  layout: (layoutParam: LayoutParam) => void;
  layoutTopics: (measuredNodes: TopicNode[]) => void;

  // selection
  getSequencedSelection: () => Array<Topic | Message | Content>;
  deselectAll: () => void;
  updateSequencedSelectionsGroup: (groups: Group[]) => void;
  updateSequencedSelectionsAgenda: (agendas: Agenda[]) => void;

  // topic util
  updateTopic: (topic: Topic) => void;
  setTopics: (topics: Topic[]) => void;
  relocateTopics: () => void;

  // get by node id
  getTopicByNodeID: (nodeId: string) => Topic | undefined;
  getContentByNodeID: (nodeId: string) => Content | undefined;
  getVirtualAssistantConfByNodeID: (
    nodeId: string
  ) => VirtualAssistantConf | undefined;
  getAssistantMessageByNodeID: (nodeId: string) => Message | undefined;
};

// VBReactflowDispatchStoreストア
export const useVBReactflowStore = create<
  VBReactflowState & VBReactflowDispatchStore
>()(
  subscribeWithSelector((set, get) => ({
    ...DefaultVBReactflowState,

    // react flow standard
    onNodesChange: (changes) => {
      set({
        topicBothEndsNodes: applyNodeChanges(
          changes,
          get().topicBothEndsNodes
        ) as Array<TopicBothEndsNode>,
        topicNodes: applyNodeChanges(changes, get().topicNodes) as TopicNode[],
        assistantNodes: applyNodeChanges(
          changes,
          get().assistantNodes
        ) as AssistantMessageNode[],
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
        topicEdges: applyEdgeChanges(changes, get().topicEdges),
        assistantEdges: applyEdgeChanges(changes, get().assistantEdges),
        contentEdges: applyEdgeChanges(changes, get().contentEdges),
      });
    },
    onConnect: (connection) => {
      set({
        topicEdges: addEdge(connection, get().topicEdges),
        assistantEdges: addEdge(connection, get().assistantEdges),
        contentEdges: addEdge(connection, get().contentEdges),
      });
    },
    onNodeDragStart: (event, node) => {
      console.log("onNodeDragStart", event, node);
    },
    onNodeDragStop: (event, node, nodes) => {
      updateNodePosition(node, get);
    },
    onNodesDelete: (nodes) => {
      console.log("onNodesDelete", nodes);
      nodes.forEach((node) => {
        switch (node.type) {
          case "topic":
            processTopicAction({
              type: "removeTopic",
              payload: { topicID: (node.data as TopicNodeParam).id },
            });
            break;
          case "assistantMessage":
            processAssistantMessageAction({
              type: "removeAssistantMessage",
              payload: {
                data: node.data as AssistantMessageNodeParam,
              },
            });
          case "content":
            processContentAction({
              type: "removeContent",
              payload: {
                contentId: node.id,
              },
            });
            break;
        }
      });
    },

    // == sequenced selection ==

    getSequencedSelection: () => {
      const result: Array<Topic | Message | Content> = [];
      get().selectedSequences.forEach((id) => {
        // content
        const content = get().getContentByNodeID(id);
        if (content) {
          result.push(content);
        }
        // topic
        const topic = get().getTopicByNodeID(id);
        if (topic) {
          result.push(topic);
        }
        // assistant
        const assistant = get().getAssistantMessageByNodeID(id);
        if (assistant) {
          result.push(assistant);
        }
      });
      return result;
    },
    deselectAll: () => {
      set({ selectedSequences: [] });
    },
    updateSequencedSelectionsGroup(groups) {
      const startTimestamp = useVBStore.getState().startTimestamp;
      if (!startTimestamp) return;

      get().selectedSequences.forEach((id) => {
        console.log("updateSequencedSelectionsGroup", id, groups);
        // content
        const content = get().getContentByNodeID(id);
        if (content) {
          useMinutesContentStore(startTimestamp)
            .getState()
            .setContent({
              ...content,
              groupIds: groups.map((group) => group.id),
            });
        }

        // topic
        const topic = get().getTopicByNodeID(id);
        if (topic) {
          processTopicAction({
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
        const assistant = get().getAssistantMessageByNodeID(id);
        const assistantConfig = get().getVirtualAssistantConfByNodeID(id);
        if (assistant && assistantConfig) {
          useMinutesAssistantStore(startTimestamp)
            .getState()
            .updateMessage(assistantConfig, {
              messages: [
                {
                  ...assistant,
                  groupIds: groups.map((group) => group.id),
                },
              ],
            });
        }
      });

      // remove unnecessary group
      useMinutesGroupStore(startTimestamp).getState().removeUnnecessaryGroup();
    },
    updateSequencedSelectionsAgenda(agendas) {
      const startTimestamp = useVBStore.getState().startTimestamp;
      if (!startTimestamp) return;

      get().selectedSequences.forEach((id) => {
        // content
        const content = get().getContentByNodeID(id);
        if (content) {
          useMinutesContentStore(startTimestamp)
            .getState()
            .setContent({
              ...content,
              agendaIds: agendas.map((agenda) => agenda.id),
            });
        }

        // topic
        const topic = get().getTopicByNodeID(id);
        if (topic) {
          processTopicAction({
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
        const assistantConfig = get().getVirtualAssistantConfByNodeID(id);
        const message = get().getAssistantMessageByNodeID(id);
        if (assistantConfig && message) {
          useMinutesAssistantStore(startTimestamp)
            .getState()
            .updateMessage(assistantConfig, {
              messages: [
                {
                  ...message,
                  agendaIds: agendas.map((agenda) => agenda.id),
                },
              ],
            });
        }
      });
    },

    // == get by node id ==
    getTopicByNodeID: (nodeId) => {
      const startTimestamp = useVBStore.getState().startTimestamp;
      const topicNode = get().topicNodes.find((node) => node.id === nodeId);
      if (topicNode) {
        return useMinutesStore(startTimestamp)
          .getState()
          .topics.find((topic) => topic.id === topicNode.id);
      }
    },
    getContentByNodeID: (nodeId) => {
      const startTimestamp = useVBStore.getState().startTimestamp;
      const contentNode = get().contentNodes.find((node) => node.id === nodeId);
      if (contentNode) {
        return useMinutesContentStore(startTimestamp)
          .getState()
          .getContent(contentNode.id);
      }
    },
    getVirtualAssistantConfByNodeID: (nodeId) => {
      const startTimestamp = useVBStore.getState().startTimestamp;
      const assistantNode = get().assistantNodes.find(
        (node) => node.id === nodeId
      );
      if (assistantNode) {
        return useMinutesStore(startTimestamp)
          .getState()
          .assistants.find(
            (assistant) =>
              assistant.assistantId === assistantNode.data.assistantId
          );
      }
    },
    getAssistantMessageByNodeID: (nodeId) => {
      const startTimestamp = useVBStore.getState().startTimestamp;
      const assistantNode = get().assistantNodes.find(
        (node) => node.id === nodeId
      );
      if (assistantNode) {
        const assistantConfig = useMinutesStore(startTimestamp)
          .getState()
          .assistants.find(
            (assistant) =>
              assistant.assistantId === assistantNode.data.assistantId
          );
        return assistantConfig
          ? (
              useMinutesAssistantStore(startTimestamp)
                .getState()
                .getOrInitAssistant(assistantConfig).messages ?? []
            ).find((message) => message.id === assistantNode.id)
          : undefined;
      }
    },

    // == util ==

    getContentImplementedNodes: () => {
      return [
        ...get().topicNodes,
        ...get().assistantNodes,
        ...get().contentNodes,
      ];
    },

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
      locate.updatedAssistantNodes.forEach((node) =>
        updateNodePosition(node, get)
      );

      // position 更新
      const assistantTreeNodes = get().assistantNodes.map((node) => {
        const located = locate.updatedAssistantNodes.find(
          (assistantNode) => assistantNode.id === node.id
        ) as AssistantMessageNode | undefined;
        return located ? located : node;
      });
      set({ assistantNodes: assistantTreeNodes });
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
      const assistantTreeNodes = get().assistantNodes;
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
      updateTopicNodes.forEach((node) => updateNodePosition(node, get));
      topicBothEndsNodes.forEach((node) => updateNodePosition(node, get));

      // 反映された topic の位置を元に、assistant の対象位置を更新

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
      updatedAssistantNodes.forEach((node) => updateNodePosition(node, get));

      // 表示変更
      set({
        assistantNodes: updatedAssistantNodes,
        contentNodes: contentNodes,
      });
    },

    layoutTopics: (measuredNodes) => {
      // _layoutTopicsQueue に含まれている　candidate　だけを対象にする
      const layoutQueue = get()._layoutTopicsQueue;
      const currentNodes = get().topicNodes;
      const targetNodes = measuredNodes.filter((candidate) =>
        layoutQueue.find((target) => target.id === candidate.id)
      );
      // targetNodes に含まれていない layoutTopicsQueue
      const remainedQueue = layoutQueue.filter(
        (node) => !targetNodes.includes(node)
      );

      console.log("layoutTopics", targetNodes, measuredNodes);
      if (targetNodes.length > 0 && currentNodes.length >= targetNodes.length) {
        // 位置を更新
        const topicNodes = [...currentNodes.slice(0, -targetNodes.length)]; // 既に　_layoutTopicsQueue　の nodeは存在する。
        const topicBothEndsNodes = get().topicBothEndsNodes;

        let lastNode =
          topicNodes.length > 0
            ? topicNodes[topicNodes.length - 1]
            : topicBothEndsNodes[0];
        let lastBounds = {
          measured: {
            height: lastNode.measured?.height ?? 0,
            width: lastNode.measured?.width ?? 0,
          },
          position: lastNode.position,
        };

        for (const topicNode of targetNodes) {
          const located = locateTopic(topicNode, lastBounds);
          updateNodePosition(located.updatedTopicNode, get); // 変更を永続化
          topicNodes.push(located.updatedTopicNode as TopicNode); // 上でTopicから生成したNodeを使うため
          lastBounds = located.bounds;
        }

        set({
          _layoutTopicsQueue: remainedQueue,
          topicNodes: topicNodes,
          topicBothEndsNodes: calcRelocatedTopicBothEndsNodes(
            topicNodes,
            topicBothEndsNodes
          ),
          topicEdges: makeTopicEdges({
            nodes: constructTopicTreeNodes({
              topicNodes,
              topicBothEndsNodes,
            }),
          }),
        });
      }
    },

    updateTopic: (topic) => {
      const topicNodes = get().topicNodes.map((node) =>
        node.id === topic.id ? makeTopicNode({ topic }) : node
      );
      set({
        topicNodes,
        topicBothEndsNodes: calcRelocatedTopicBothEndsNodes(
          topicNodes,
          get().topicBothEndsNodes
        ),
      });
    },

    setTopics: (topics) => {
      const newTopicNodes = topics.map((topic) => makeTopicNode({ topic }));
      const topicNodes = [...get().topicNodes];
      const topicBothEndsNodes = get().topicBothEndsNodes;
      let lastNode =
        topicNodes.length > 0
          ? topicNodes[topicNodes.length - 1]
          : topicBothEndsNodes[0];
      let lastBounds = {
        measured: {
          height: lastNode.measured?.height ?? 0,
          width: lastNode.measured?.width ?? 0,
        },
        position: lastNode.position,
      };
      const _layoutTopicsQueue: Array<TopicNode> = [];
      for (const topicNode of newTopicNodes) {
        const located = locateTopic(topicNode, lastBounds);
        updateNodePosition(located.updatedTopicNode, get); // 変更を永続化
        _layoutTopicsQueue.push(located.updatedTopicNode as TopicNode);
        topicNodes.push(located.updatedTopicNode as TopicNode); // 上でTopicから生成したNodeを使うため
        lastBounds = located.bounds;
      }
      set({
        _layoutTopicsQueue: _layoutTopicsQueue,
        topicNodes,
        topicBothEndsNodes: calcRelocatedTopicBothEndsNodes(
          topicNodes,
          topicBothEndsNodes
        ),
      });
    },

    relocateTopics: () => {
      set({
        topicNodes: DefaultVBReactflowState.topicNodes,
        topicBothEndsNodes: DefaultVBReactflowState.topicBothEndsNodes,
        topicEdges: DefaultVBReactflowState.topicEdges,
      });

      const topics = useMinutesStore(
        useVBStore.getState().startTimestamp
      ).getState().topics;
      const topicNodes = topics.map((topic) => makeTopicNode({ topic }));
      const topicBothEndsNodes = calcRelocatedTopicBothEndsNodes(
        topicNodes,
        get().topicBothEndsNodes
      );
      set({
        topicNodes,
        topicBothEndsNodes: calcRelocatedTopicBothEndsNodes(
          topicNodes,
          topicBothEndsNodes
        ),
        topicEdges: makeTopicEdges({
          nodes: constructTopicTreeNodes({
            topicNodes,
            topicBothEndsNodes,
          }),
        }),
      });
    },
  }))
);

// ReactFlow standard subscribe
useVBReactflowStore.subscribe((current, pre) => {
  if (
    current.topicNodes !== pre.topicNodes ||
    current.assistantNodes !== pre.assistantNodes ||
    current.contentNodes !== pre.contentNodes
  ) {
    useVBReactflowStore.setState({
      nodes: [
        ...constructTopicTreeNodes({
          topicBothEndsNodes: useVBReactflowStore.getState().topicBothEndsNodes,
          topicNodes: useVBReactflowStore.getState().topicNodes,
        }),
        ...useVBReactflowStore.getState().assistantNodes,
        ...useVBReactflowStore.getState().contentNodes,
      ],
      edges: [
        ...useVBReactflowStore.getState().topicEdges,
        ...useVBReactflowStore.getState().assistantEdges,
      ],
    });
  }
});

// == Node Measured ==

useVBReactflowStore.subscribe(
  (state) => state.nodes,
  (nodes, prevNodes) => {
    const lastAppendedNodes = nodes.filter(
      (node) =>
        node.measured && // measured
        !prevNodes.find((prevNode) => prevNode.id === node.id)?.measured // unmeasured at the previous state
    );

    if (lastAppendedNodes.length > 0) {
      console.log("lastAppendedNodes", lastAppendedNodes, nodes, prevNodes);
      useVBReactflowStore.setState({
        lastAppendedNodes,
      });
      // topic nodes
      useVBReactflowStore
        .getState()
        .layoutTopics(lastAppendedNodes.filter((node) => isTopicNode(node)));
    }
  }
);

// assistant message Node 自動配置
useVBReactflowStore.subscribe(
  (state) => state.assistantNodes,
  (assistantNodes, preAssistantNodes) => {
    // topic
    assistantNodes
      .filter((node) => !!node.measured)
      .filter(
        (node) =>
          !!preAssistantNodes.find(
            (preNode) =>
              preNode.id === node.id && preNode.measured === undefined
          )
      )
      // 位置が原点のものが未配置の可能性あり
      .filter((node) => node.position.x === 0 && node.position.y == 0)
      // 対象に
      .forEach((node) => {
        const message = useVBReactflowStore
          .getState()
          .getAssistantMessageByNodeID(node.data.id);
        if (message && message.connectedMessageIds.length > 0) {
          const targetNode = useVBReactflowStore
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
            useVBReactflowStore.getState().updateAssistantAt(targetNode);
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

// # Util to declare the structure of the topic tree
const makeTopicNode = (props: { topic: Topic }): TopicNode => {
  const { topic } = props;
  return {
    id: topic.id,
    type: "topic",
    position: topic.position,
    width: getLayoutParam().topic.width,
    data: {
      id: topic.id,
      type: "topic",
      agendaIds: topic.agendaIds,
      groupIds: topic.groupIds,
    },
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
const makeAssistantNodes = (props: {
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
      id: message.id,
      type: "assistantMessage",
      agendaIds: message.agendaIds,
      groupIds: message.groupIds,
      assistantId: assistantState.vaConfig.assistantId,
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

// Content
const makeContentNode = (props: { content: Content }): ContentNode => {
  const { content } = props;
  return {
    id: content.id,
    type: "content",
    position: content.position,
    width: content.width,
    data: {
      id: content.id,
      type: "content",
      agendaIds: content.agendaIds,
      groupIds: content.groupIds,
    },
  };
};

// == Util ==

// assistant 毎に配置すべきNodeを取得
const updateAssistantLocatedNodeMap = () => {
  const assistantTreeNodes = useVBReactflowStore.getState()
    .assistantNodes as AssistantMessageNode[];
  const _assistantLastNodeMap: Map<string, Node> = new Map();
  assistantTreeNodes.forEach((assistantNode) => {
    // Assistantは紐づく最後のNodeに配置する
    // Assistant が connectedMessageIds を持っていないことは、運用上ありえないはず
    const assistantMessage = useVBReactflowStore
      .getState()
      .getAssistantMessageByNodeID(assistantNode.id);
    if (assistantMessage && assistantMessage.connectedMessageIds.length > 0) {
      _assistantLastNodeMap.set(
        assistantNode.id,
        useVBReactflowStore
          .getState()
          .nodes.filter(
            (node) => node.id === assistantMessage.connectedMessageIds.at(-1)
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

  useVBReactflowStore.setState({
    _assistantLocatedNodeMap: assistantLocatedNodeMap,
  });
};

const updateNodePosition = (
  node: Node,
  get: () => VBReactflowState & VBReactflowDispatchStore
) => {
  const startTimestamp = useVBStore.getState().startTimestamp;
  if (useVBStore.getState().isNoMinutes()) return;
  const position = {
    x: node.position.x,
    y: node.position.y,
  };
  switch (node.type) {
    case "topic":
      const topic = get().getTopicByNodeID(node.id);
      if (!topic) return;
      useMinutesStore(startTimestamp)
        .getState()
        .updateTopic({
          ...topic,
          position,
        });
      break;
    case "assistantMessage":
      const vaConfig = get().getVirtualAssistantConfByNodeID(node.id);
      const assistantMessage = get().getAssistantMessageByNodeID(node.id);
      if (!assistantMessage || !vaConfig) return;
      console.log(
        "updateNodePosition: assistantMessage",
        vaConfig.label,
        assistantMessage
      );
      useMinutesAssistantStore(startTimestamp)
        .getState()
        .updateMessage(vaConfig, {
          messages: [
            {
              ...assistantMessage,
              position,
            },
          ],
        });
      break;
    case "content":
      const content = get().getContentByNodeID(node.id);
      if (!content) return;
      useMinutesContentStore(startTimestamp)
        .getState()
        .setContent({
          ...content,
          position,
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
  const updatedTopicNode = { ...targetNode }; // 更新したので新オブジェクトを返す
  updatedTopicNode.position = {
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
  const assistantGroup = useVBReactflowStore
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

const calcRelocatedTopicBothEndsNodes = (
  topicNodes: TopicNode[],
  topicBothEndsNodes: TopicBothEndsNode[]
): TopicBothEndsNode[] => {
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

  return [
    updatedHeaderNode ?? topicBothEndsNodes[0],
    updatedDiscussionNode ?? topicBothEndsNodes[1],
  ];
};

const updateAssistantNodes = ({
  startTimestamp,
  assistantsMap,
}: {
  startTimestamp: number;
  assistantsMap: Map<string, AssistantState>;
}) => {
  if (!useVBStore.getState().isNoMinutes()) {
    // create assistant nodes
    const assistantNodes = Array.from(assistantsMap.values()).flatMap(
      (assistantState) =>
        (assistantState.messages ?? []).map((message) =>
          makeAssistantNodes({
            assistantState,
            message,
            startTimestamp,
          })
        )
    );
    useVBReactflowStore.setState({
      assistantNodes: assistantNodes,
    });

    const assistantEdges = assistantNodes.flatMap((assistantMessageNode) => {
      const message = useVBReactflowStore
        .getState()
        .getAssistantMessageByNodeID(assistantMessageNode.id);
      return message
        ? message.connectedMessageIds.map((messageId) =>
            makeAssistantMessageEdge({
              source: messageId,
              target: assistantMessageNode.id,
            })
          )
        : [];
    });
    useVBReactflowStore.setState({
      assistantEdges: assistantEdges,
    });
    console.log("updateAssistantNodes", assistantNodes, assistantEdges);
  }
};

// === prepareNode with Subscribe on MinutesAction ===

let unsubscribeAssistantStore: (() => void) | null = null;
export const prepareAssistantNodeTo = (startTimestamp: number) => {
  // 1. 初期状態を手動で取得してノードをセット
  console.log("useVBReactflowStore: updatedAssistant: init");
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
      console.log("useVBReactflowStore: updatedAssistant: subscribe");
      updateAssistantNodes({ startTimestamp, assistantsMap });
      updateAssistantLocatedNodeMap();
      //レイアウト処理は subscribe で行う
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
                    message.groupIds.length === targetMessage.groupIds.length &&
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
};

let unsubscribeContentStore: (() => void) | null = null;
export const prepareContentsNodeTo = (startTimestamp: number) => {
  useVBReactflowStore.setState({
    contentNodes: Array.from(
      useMinutesContentStore(startTimestamp).getState().contentMap.values()
    ).map((content) => makeContentNode({ content })),
  });

  if (unsubscribeContentStore) unsubscribeContentStore();
  unsubscribeContentStore = useMinutesContentStore(startTimestamp).subscribe(
    (state) => state.contentMap,
    (state) => {
      useVBReactflowStore.setState({
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
};
