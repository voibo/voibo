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
import { createStore, del, get, set } from "idb-keyval";
import { enableMapSet, produce } from "immer";
import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  StateStorage,
  subscribeWithSelector,
} from "zustand/middleware";
import { IPCInvokeKeys, IPCReceiverKeys } from "../../../common/constants.js";
import {
  GENERAL_ASSISTANT_NAME,
  getDefaultMessage,
  InvokeResult,
  Message,
  TargetCategory,
  TargetClassification,
} from "../../../main/agent/agentManagerDefinition.js";
import { detectVAMessageType } from "../assistant/message/detectVAMessageType.jsx";
import { AIConfig } from "../common/aiConfig.jsx";
import { isTopic, Topic, TopicSeed } from "../topic/Topic.js";
import { Content, isContent } from "./Content.js";
import { ExpandJSONOptions, HydrateState } from "./IDBKeyValPersistStorage.jsx";
import { useAgendaStore } from "./useAgendaStore.jsx";
import { useVFStore } from "./useVFStore.jsx";
enableMapSet();

//  Custom storage object
const assistantIDBStore = createStore("minutes_assistant", "assistant"); //  This code must be defined before the store definition
const AssistantPersistStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    //console.log("AssistantPersistStorage.getItem", name);
    return (await get(name, assistantIDBStore)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    const current = await get(name, assistantIDBStore);
    if (current === value) {
      //console.warn("AssistantPersistStorage.setItem: same value skipped", name);
      return;
    }
    console.log("AssistantPersistStorage.setItem:", name);
    await set(name, value, assistantIDBStore);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name, assistantIDBStore);
  },
};

// === State / Dispatch ===

const storeCache = new Map<number, ReturnType<typeof useAssistantsStoreCore>>();
export const useMinutesAssistantStore = (minutesStartTimestamp: number) => {
  let newStore;
  if (storeCache.has(minutesStartTimestamp)) {
    // 既にキャッシュに存在する場合はそれを利用
    newStore = storeCache.get(minutesStartTimestamp)!;
  } else {
    // ない場合は新たに作成してキャッシュに保存
    newStore = useAssistantsStoreCore(minutesStartTimestamp);
    storeCache.set(minutesStartTimestamp, newStore);
  }
  return newStore;
};

export type VirtualAssistantUpdateMode =
  | "manual"
  | "at_topic_updated"
  | "at_agenda_updated"
  | "at_agenda_completed"; //| "at_recording_stopped";
export type MessageViewMode = "history" | "latest_response";
export type TargetMode = "manualSelected" | "systemFiltered" | "latest";

export type InvokeAssistantAttachOption =
  | {
      attachment: "none";
    }
  | {
      attachment: "topic";
      target: TargetMode;
    }
  | {
      attachment: "discussion";
      target: TargetMode;
    };

export type VirtualAssistantType = "va-custom" | "va-general";

export type VirtualAssistantConf = {
  aiConfig: AIConfig;
  assistantId: string;
  assistantName: string;
  updateMode: VirtualAssistantUpdateMode;
  messageViewMode: MessageViewMode;
  label: string;
  icon: string;
  initialPrompt?: string;
  updatePrompt?: string;
  attachOption?: InvokeAssistantAttachOption;
  targetClassification?: TargetClassification;
  targetCategory?: TargetCategory;
  assistantType?: VirtualAssistantType;
};

export type AttachmentMode = "discussion" | "topic" | "none";
export type AssistantState = {
  // VAConfig
  vaConfig: VirtualAssistantConf;
  // attachment
  attachment: AttachmentMode;
  // loaded
  loaded: boolean;
  // messages
  messages?: Array<Message>; // LangChain で記録されているメッセージ。
  messagesWithInvoked?: Array<Message>; // invoke message も含めたヒストリー形式での表示用のメッセージ
  // request to assistant
  onProcess: boolean;
  invokeQueue: Message[];
  resolvingQueue?: Message;
  req?: AssistantAction;
};

export const initAssistantState = (
  vaConfig: VirtualAssistantConf,
  loaded: boolean
): AssistantState => {
  return {
    attachment: "none",
    onProcess: false,
    loaded,
    vaConfig: vaConfig,
    invokeQueue: [],
    messages: [],
    messagesWithInvoked: [],
    req: undefined,
    resolvingQueue: undefined,
  };
};

export type AssistantAction =
  | {
      type: "invokeAssistant";
      payload: {
        queue: Array<Message>;
      };
    }
  | {
      type: "processRejected";
    }
  | {
      type: "appendFunctionalMessage";
      payload: {
        message: Message;
        startTimestamp: number;
        assistantName: string;
      };
    }
  | {
      type: "appendMessage";
      payload: {
        message: Message;
        startTimestamp: number;
        assistantName: string;
      };
    }
  | {
      type: "initialize";
      payload: {
        startTimestamp: number;
        assistantName: string;
      };
    }
  | {
      type: "changeMinutes";
      payload: {
        startTimestamp: number;
        assistantName: string;
        messages?: Array<Message>; // LangChain で記録されているメッセージ。
        messagesWithInvoked?: Array<Message>; // invoke message も含めたヒストリー形式での表示用のメッセージ
      };
    }
  | { type: "removeMessage"; payload: { messageId: string } }
  | { type: "clearAll" }
  | { type: "setAttachment"; payload: { attachmentMode: AttachmentMode } }
  | { type: "updateMessage"; payload: { messages: Array<Message> } };

const assistantReducer = (props: {
  minutesStartTimestamp: number;
  vaConfig: VirtualAssistantConf;
  get: () => AssistantsStateStore & AssistantsDispatchStore & HydrateState;
}): ((state: AssistantState, action: AssistantAction) => AssistantState) => {
  const { minutesStartTimestamp, vaConfig, get } = props;
  const reducer = (state: AssistantState, action: AssistantAction) => {
    let newState: AssistantState = state;
    switch (action.type) {
      case "initialize":
        // 定義済みの専用Treadを削除して新しいThreadを作成する。　⇒　正常時は changeMinutes　が最後に呼ばれて終了する
        if (
          action.payload.startTimestamp == minutesStartTimestamp &&
          action.payload.assistantName == vaConfig.assistantName
        ) {
          newState = {
            ...initAssistantState(vaConfig, get()._hasHydrated),
            messages: [],
            messagesWithInvoked: [],
            req: undefined,
            onProcess: false,
          };
        }
        console.log("assistantReducer: initialize", vaConfig.label, newState);
        break;
      case "changeMinutes":
        newState = {
          ...initAssistantState(vaConfig, get()._hasHydrated),
          messages: action.payload.messages ?? [],
          messagesWithInvoked: action.payload.messagesWithInvoked ?? [],
          req: undefined,
          onProcess: false,
        };
        //console.log("assistantReducer: changeMinutes",vaConfig.label, newState);
        break;
      case "clearAll":
        // 完全に初期状態にする
        newState = initAssistantState(vaConfig, get()._hasHydrated);
        break;
      // == 設定関係 ==
      case "setAttachment":
        // invoke するときのメッセージに添付する内容を変更する
        newState = {
          ...state,
          attachment: action.payload.attachmentMode,
        };
        break;
      // == Assistant Invoke 関係 ==
      // invoke リクエストを enqueue する。 dequeue は subscribeした中で processInvoke で行う
      case "invokeAssistant":
        const invokeQueue = [...state.invokeQueue, ...action.payload.queue];
        const messagesWithInvoked = [
          ...(state.messagesWithInvoked ?? []),
          ...action.payload.queue,
        ];
        newState = {
          ...state,
          invokeQueue,
          messagesWithInvoked,
          req: action,
        };
        console.warn(
          "assistantReducer: invokeAssistant",
          vaConfig.label,
          newState
        );
        break;
      case "appendMessage": // invokeProcess に変更されたので、appendMessage の処理は不要になったはず
      case "appendFunctionalMessage":
        // Assistant からの返答を受け取る
        if (
          action.payload.startTimestamp == minutesStartTimestamp &&
          action.payload.assistantName == vaConfig.assistantName
        ) {
          const cloneState: AssistantState = JSON.parse(JSON.stringify(state));
          const messages = [...(state.messages ?? []), action.payload.message];
          newState = {
            ...cloneState,
            messages, // メッセージのインスタンスは残さないと後々判定できない
            messagesWithInvoked: [
              ...(state.messagesWithInvoked ?? []),
              action.payload.message,
            ],
            req: undefined,
            attachment: "none" as AttachmentMode,
          };
          if (action.type == "appendMessage") {
            // functionalMessage の場合は、継続中のリクエストを残す
            newState.onProcess = false;
            newState.resolvingQueue = undefined;
          }
        }
        break;
      case "updateMessage":
        // メッセージの更新
        let newMessages = [...(state.messages ?? [])];
        let newMessagesWithInvoked = [...(state.messagesWithInvoked ?? [])];
        action.payload.messages.forEach((message) => {
          const updateIndex =
            newMessages.findIndex((value) => value.id === message.id) ?? -1;
          if (updateIndex >= 0) {
            newMessages = [
              ...newMessages.slice(0, updateIndex),
              message,
              ...newMessages.slice(updateIndex + 1),
            ];
          }
          const updateIndexWithInvoked = newMessagesWithInvoked.findIndex(
            (value) => value.id === message.id
          );
          if (updateIndexWithInvoked >= 0) {
            newMessagesWithInvoked = [
              ...newMessagesWithInvoked.slice(0, updateIndexWithInvoked),
              message,
              ...newMessagesWithInvoked.slice(updateIndexWithInvoked + 1),
            ];
          }
        });
        newState = {
          ...state,
          messages: newMessages,
          messagesWithInvoked: newMessagesWithInvoked,
        };
        break;
      case "removeMessage":
        const targetIndex =
          (state.messages ?? []).findIndex(
            (value) => value.id === action.payload.messageId
          ) ?? -1;
        if (targetIndex >= 0) {
          newState = {
            ...state,
            messages: [
              ...(state.messages ?? []).slice(0, targetIndex),
              ...(state.messages ?? []).slice(targetIndex + 1),
            ],
          };

          const targetIndexWithInvoked = (
            state.messagesWithInvoked ?? []
          ).findIndex((value) => value.id === action.payload.messageId);
          if (targetIndexWithInvoked >= 0) {
            newState = {
              ...newState,
              messagesWithInvoked: [
                ...(state.messagesWithInvoked ?? []).slice(
                  0,
                  targetIndexWithInvoked
                ),
                ...(state.messagesWithInvoked ?? []).slice(
                  targetIndexWithInvoked + 1
                ),
              ],
            };
          }
        }
        break;
      case "processRejected":
        // プロセスの失敗
        newState = {
          ...state,
          req: undefined,
          attachment: "none",
          onProcess: false,
          resolvingQueue: undefined,
        };
        break;
    }
    return newState;
  };
  return (state: AssistantState, action: AssistantAction): AssistantState =>
    reducer(state, action);
};

// === Util ===

export function makeInvokeParam({
  basePrompt,
  messages,
  attachOption,
  customField,
  withoutAgenda,
}: {
  basePrompt: string;
  messages: Array<Topic | Content | Message>;
  attachOption: InvokeAssistantAttachOption;
  customField?: Record<string, any>;
  withoutAgenda?: boolean;
}): Message {
  const defaultFilter = (message: Topic | Content | Message, index: number) => {
    if (attachOption.attachment !== "none") {
      switch (attachOption.target) {
        case "systemFiltered": // system 側で事前にフィルタリングされたものはそのまま
        case "manualSelected": // manual input で選択された場合場合は、事前にフィルターしておく ＝ systemFiltered と同じ
          return true;
        case "latest":
          return index === messages.length - 1;
        default:
          return false;
      }
    } else {
      return true; // 何も付与しない場合は全て
    }
  };

  let prompt = basePrompt;
  let context = "";
  let agendaContext = "";

  const filteredMessages = messages.filter(defaultFilter);
  const duplicateCheckMap = new Map<string, TopicSeed>();
  filteredMessages.forEach((message) => {
    if (isTopic(message)) {
      // Topic の場合は、attachOption によってフィルタリングする
      switch (attachOption.attachment) {
        case "discussion":
          if (
            message.seedData &&
            !duplicateCheckMap.has(message.seedData.text)
          ) {
            duplicateCheckMap.set(message.seedData.text, message.seedData);
            context = `${context}\n\n${message.seedData.text}\n`;
          }
          break;
        case "topic":
          context = `${context}\n\n#${message.title}\n${
            message.topic instanceof Array
              ? message.topic.join("\n")
              : message.topic
          }\n`;
          break;
        case "none":
        default:
          break;
      }
    } else if (isContent(message)) {
      // content の場合
      context = `${context}\n\n${message.content}\n`;
    } else {
      console.error("makeInvokeParam: unknown message type", message);
    }
  });

  // agenda の内容を取得
  const agendas = Array.from(
    new Map<string, string>(
      filteredMessages
        .flatMap((message) => message.agendaIds)
        .filter((id) => id !== undefined)
        .map((id) => [id, id])
    ).values()
  )
    .map((id) => useAgendaStore.getState().getAgenda(id))
    .filter((agenda) => agenda !== undefined);

  // make prompt for discussion or topic
  if (
    attachOption.attachment == "discussion" ||
    attachOption.attachment == "topic"
  ) {
    if (agendas.length > 0 && !withoutAgenda) {
      agendaContext = agendas.reduce(
        (acc, agenda) => `${acc}\n\n${agenda.title}\n${agenda.detail ?? ""}\n`,
        ""
      );
      prompt = `While considering the following agenda, process the following content according to the following instructions.\n\n"""##Instructions\n${basePrompt} \n"""\n\n"""##Agenda\n${agendaContext} \n"""\n\n"""##Content\n${context} \n"""`;
    } else {
      prompt = `Process the following contents according to the following instructions.\n\n"""##Instructions\n${basePrompt} \n"""\n\n"""##Content\n${context} \n"""`;
    }
  } else {
    prompt = basePrompt;
  }

  const connectedMessageIds = filteredMessages.map((message) => message.id);
  const agendaIds = agendas.map((agenda) => agenda.id);
  const result: Message = {
    ...getDefaultMessage(),
    speaker: "human",
    content: prompt,
    customField: {
      ...customField,
      // 以下は、Assistant が利用する Custom Field
      CONNECTED_MESSAGE_IDS: connectedMessageIds,
      AGENDA_IDS: agendaIds,
      CONTEXT: context,
      AGENDA_CONTEXT: agendaContext,
      AGENDAS: agendas,
    },
    connectedMessageIds,
    agendaIds,
  };

  //console.log("makePrompt", result);
  return result;
}

export function makeTopicOrientedInvokeParam({
  basePrompt,
  topics,
  attachOption,
  customField,
  withoutAgenda,
}: {
  basePrompt: string;
  topics: Topic[];
  attachOption: InvokeAssistantAttachOption;
  customField?: Record<string, any>;
  withoutAgenda?: boolean;
}): Message {
  const defaultFilter = (topic: Topic, index: number) => {
    if (attachOption.attachment !== "none") {
      switch (attachOption.target) {
        case "systemFiltered": // system 側で事前にフィルタリングされたものはそのまま
          return true;
        case "latest":
          return index === topics.length - 1;
        case "manualSelected": // manual input で選択された場合だけ
          return topic.selected;
        default:
          return false;
      }
    } else {
      return true; // 何も付与しない場合は全て
    }
  };

  let prompt = basePrompt;
  let context = "";
  let agendaContext = "";
  let filteredTopics: Topic[] = [];
  switch (attachOption.attachment) {
    case "discussion":
      filteredTopics = topics.filter(defaultFilter);
      // 重複する Seed を除去
      const uniqueItems = Array.from(
        new Map<string, TopicSeed>(
          filteredTopics
            .map((topic) => topic.seedData)
            .filter((seedData) => seedData !== undefined)
            .map((seedData) => [seedData.text, seedData])
        ).values()
      );
      context = uniqueItems.reduce(
        (acc, seedData) => `${acc}\n\n${seedData.text}\n`,
        ""
      );
      break;
    case "topic":
      filteredTopics = topics.filter(defaultFilter);
      context = filteredTopics.reduce(
        (acc, topic) =>
          `${acc}\n\n#${topic.title}\n${
            topic.topic instanceof Array ? topic.topic.join("\n") : topic.topic
          }\n`,
        ""
      );
      break;
    case "none":
    default:
      // 何も付与しない
      prompt = basePrompt;
      break;
  }

  // agenda の内容を取得
  const agendas = Array.from(
    new Map<string, string>(
      filteredTopics
        .flatMap((topic) => topic.seedData?.agendaIdList)
        .filter((id) => id !== undefined)
        .map((id) => [id, id])
    ).values()
  )
    .map((id) => useAgendaStore.getState().getAgenda(id))
    .filter((agenda) => agenda !== undefined);

  // make prompt for discussion or topic
  if (
    attachOption.attachment == "discussion" ||
    attachOption.attachment == "topic"
  ) {
    if (agendas.length > 0 && !withoutAgenda) {
      agendaContext = agendas.reduce(
        (acc, agenda) => `${acc}\n\n${agenda.title}\n${agenda.detail ?? ""}\n`,
        ""
      );
      prompt = `While considering the following agenda, process the following content according to the following instructions.\n\n"""##Instructions\n${basePrompt} \n"""\n\n"""##Agenda\n${agendaContext} \n"""\n\n"""##Content\n${context} \n"""`;
    } else {
      prompt = `Process the following contents according to the following instructions.\n\n"""##Instructions\n${basePrompt} \n"""\n\n"""##Content\n${context} \n"""`;
    }
  }

  const connectedMessageIds = filteredTopics.map((message) => message.id);
  const agendaIds = agendas.map((agenda) => agenda.id);
  const result: Message = {
    ...getDefaultMessage(),
    speaker: "human",
    content: prompt,
    customField: {
      ...customField,
      // 以下は、Assistant が利用する Custom Field
      CONNECTED_MESSAGE_IDS: connectedMessageIds,
      AGENDA_IDS: agendaIds,
      CONTEXT: context,
      AGENDA_CONTEXT: agendaContext,
      AGENDAS: agendas,
    },
    connectedMessageIds,
    agendaIds,
  };

  //console.log("makePrompt", result);
  return result;
}

// ==== Zustand ====
export type AssistantsStateStore = {
  assistantsMap: Map<string, AssistantState>;
};

export type AssistantsDispatchStore = {
  getOrInitAssistant: (vaConfig: VirtualAssistantConf) => AssistantState;
  setAssistant: (assistant: AssistantState) => void;
  removeAssistant: (assistantId: string) => void;
  assistantDispatch: (
    vaConfig: VirtualAssistantConf
  ) => (action: AssistantAction) => void;
  enqueueTopicRelatedInvoke: (vaConfig: VirtualAssistantConf) => void;
  processInvoke: (vaConfig: VirtualAssistantConf) => void;
};

const useAssistantsStoreCore = (minutesStartTimestamp: number) => {
  console.log("useAssistantsStoreCore", minutesStartTimestamp);
  return create<
    AssistantsStateStore & AssistantsDispatchStore & HydrateState
  >()(
    persist(
      subscribeWithSelector((set, get) => ({
        // Hydrate
        _hasHydrated: false,
        _setHasHydrated: (state) => {
          const newAssistantMap = new Map<string, AssistantState>(
            Array.from(get().assistantsMap).map(([key, assistant]) => [
              key,
              {
                ...assistant,
                loaded: state,
              },
            ])
          );
          set({
            _hasHydrated: state,
            assistantsMap: newAssistantMap,
          });
        },

        // State
        assistantsMap: new Map<string, AssistantState>(),

        setAssistant: (assistant) => {
          if (!get()._hasHydrated) {
            throw new Error("setAssistant: _hasHydrated is false");
          }
          set(
            produce((state: AssistantsStateStore) => {
              state.assistantsMap.set(
                assistant.vaConfig.assistantId,
                assistant
              );
            })
          );
        },

        removeAssistant: (assistantId) => {
          if (!get()._hasHydrated) {
            throw new Error("removeAssistant: _hasHydrated is false");
          }
          set(
            produce((state: AssistantsStateStore) => {
              state.assistantsMap.delete(assistantId);
            })
          );
        },

        getOrInitAssistant: (vaConfig): AssistantState => {
          if (!get()._hasHydrated) {
            throw new Error("getOrInitAssistant: _hasHydrated is false");
          }

          try {
            // FIXME: 上が非同期になっているので、本来このような設定は適切ではないが、無駄を許容。
            // listener to make Mind Map
            window.electron.on(
              IPCReceiverKeys.ON_MIND_MAP_CREATED,
              (event: any, mindMap: InvokeResult) => {
                if (!get()._hasHydrated) return;
                get().assistantDispatch(vaConfig)({
                  type: "appendFunctionalMessage",
                  payload: {
                    startTimestamp: mindMap.startTimestamp,
                    assistantName: mindMap.assistantName,
                    message: mindMap.message,
                  },
                });
              }
            );

            const { assistantsMap, setAssistant, _hasHydrated } = get();
            // 既存のアシスタントを取得、または新たに初期化して設定
            let target = assistantsMap.get(vaConfig.assistantId);
            if (!target) {
              target = initAssistantState(vaConfig, _hasHydrated);
              set(
                produce((state: AssistantsStateStore) => {
                  state.assistantsMap.set(
                    target!.vaConfig.assistantId,
                    target!
                  );
                })
              );
            }
            return target;
          } catch (error) {
            console.error("getOrInitAssistant: error", error);
            throw error;
          }
        },

        assistantDispatch: (vaConfig) => (action) => {
          if (minutesStartTimestamp) {
            if (!get()._hasHydrated) {
              throw new Error("assistantDispatch: _hasHydrated is false");
            }
            try {
              // == Update state ==
              const targetReducer = assistantReducer({
                minutesStartTimestamp,
                vaConfig: vaConfig,
                get: get,
              });
              const state = get().getOrInitAssistant(vaConfig);
              const newState = targetReducer(state, action);
              get().setAssistant(newState);
              // == post process ==
              if (action.type === "initialize") {
                get().enqueueTopicRelatedInvoke(vaConfig); // 並行処理
              }
            } catch (e) {
              console.error("assistantDispatch: error", e);
            }
          }
        },

        enqueueTopicRelatedInvoke: (vaConfig) => {
          if (!get()._hasHydrated) {
            console.warn("enqueueTopicRelatedInvoke: _hasHydrated is false");
            return;
          }

          const assistantConfig = vaConfig;
          // check if assistant is GeneralAssistant
          if (assistantConfig.assistantName === GENERAL_ASSISTANT_NAME) {
            return;
          }
          const state = get().getOrInitAssistant(vaConfig);
          const dispatch = get().assistantDispatch(vaConfig);

          const vfState = useVFStore.getState();
          const { updateMode, attachOption, updatePrompt } = assistantConfig;
          if (
            state.loaded && // hydrate が終わっている
            updateMode != "manual" // 手動更新モードでない
          ) {
            const getAgenda = useAgendaStore.getState().getAgenda;
            const getAllAgendas = useAgendaStore.getState().getAllAgendas;
            // = Prepare =
            let currentAttachOption: InvokeAssistantAttachOption | undefined =
              attachOption;
            let topics: Topic[] | undefined = undefined;
            // == 当該Assistantの進行状況 = Topic の解消度 ==
            const resolvedTopicIDs = [
              // message で解消済みのトピック
              ...(state.messages ?? [])
                .filter((message) => {
                  const detectedType = detectVAMessageType(message).type;
                  return (
                    detectedType === "LangChainAIMessage" ||
                    detectedType === "LangChainAIMessageMindMap"
                    //detectedType === "ProcessRejected" // 取得に失敗したものは解消済みとみなす
                  );
                })
                .map((message) => message.connectedMessageIds)
                .filter((messageIds) => messageIds !== undefined)
                .flat(),
              // invokeQueue にある invokeParam の topic も解消済みとみなす
              ...state.invokeQueue
                .filter((param) => param.connectedMessageIds)
                .map((param) => param.connectedMessageIds!)
                .flat(),
            ]; // id重複をあえて許容

            /*
            console.log(
              "enqueueTopicRelatedInvoke: resolvedTopicIDs",
              resolvedTopicIDs
            );
            */

            if (updateMode === "at_topic_updated") {
              // = 1. 対象トピックの抽出 =
              let ccFilteredTopics: Topic[] = []; // classification, category でフィルタリングされたトピック
              ccFilteredTopics = vfState.topics
                // 当該Assistantの topicClassification 対象トピックか
                .filter(
                  (topic) =>
                    topic.classification
                      ? state.vaConfig.targetClassification
                        ? state.vaConfig.targetClassification === "all" ||
                          topic.classification ===
                            state.vaConfig.targetClassification
                        : true // topic.classification があるのに topicClassification がないものは全て対象
                      : state.vaConfig.targetClassification === "all" // topic に classification がないものは all 設定以外は対象外
                )
                // 当該Assistantの topicCategory 対象トピックか
                .filter(
                  (topic) =>
                    topic.category
                      ? state.vaConfig.targetCategory
                        ? state.vaConfig.targetCategory === "Unknown" ||
                          topic.category === state.vaConfig.targetCategory
                        : true // topic.category があるのに topicCategory がないものは全て対象
                      : state.vaConfig.targetCategory === "Unknown" // topic に category がないものは Unknown 設定以外は対象外
                );
              // 未解決のトピックを順番に抽出
              const filteredTopics = ccFilteredTopics.filter((topic) =>
                topic.id ? !resolvedTopicIDs.includes(topic.id) : false
              );

              // = 2. Assistantを呼び出す =
              const reqQueue = filteredTopics.map((topic) => {
                topics = [topic];
                currentAttachOption = currentAttachOption ?? {
                  attachment: "topic",
                  target: "latest", // 最新のトピックのみ
                };

                // structured param があれば react component も custom field に記録
                let paramToInvoke: any = {
                  basePrompt: updatePrompt,
                  topics,
                  attachOption: currentAttachOption,
                  useTopicFiler: false, // 指定した topic をそのまま使用する
                };
                if (
                  state.vaConfig.aiConfig.structuredOutputSchema &&
                  state.vaConfig.aiConfig.reactComponent
                ) {
                  paramToInvoke = {
                    ...paramToInvoke,
                    customField: {
                      ...paramToInvoke.customField,
                      STRUCTURED_OUTPUT_SCHEMA:
                        state.vaConfig.aiConfig.structuredOutputSchema,
                      REACT_COMPONENT: state.vaConfig.aiConfig.reactComponent,
                    },
                  };
                }
                return makeTopicOrientedInvokeParam(paramToInvoke);
              });

              if (reqQueue.length > 0) {
                //console.log("enqueueTopicRelatedInvoke: at updated", reqQueue);
                dispatch({
                  type: "invokeAssistant",
                  payload: {
                    queue: reqQueue,
                  },
                });
              }
            } else if (updateMode === "at_agenda_updated") {
              // = 1. 対象の抽出 =
              const agendaFilteredTopics = vfState.topics
                .filter((topic) => !resolvedTopicIDs.includes(topic.id))
                .filter(
                  (topic) =>
                    topic.seedData?.agendaIdList &&
                    topic.seedData.agendaIdList.length > 0
                );

              // = 2. Agenda 毎に Assistant を呼び出す =
              if (agendaFilteredTopics.length > 0) {
                const reqQueue: Array<Message> = [];
                const targetTopic = agendaFilteredTopics[0];
                const targetTopicIndex = vfState.topics.indexOf(targetTopic);
                targetTopic
                  .seedData!.agendaIdList!.map((agendaId) =>
                    getAgenda(agendaId)
                  )
                  .filter((agenda) => agenda !== undefined)
                  // 当該Assistantの Classification 対象トピックか
                  .filter(
                    (agenda) =>
                      agenda.classification
                        ? state.vaConfig.targetClassification
                          ? state.vaConfig.targetClassification === "all" ||
                            agenda.classification ===
                              state.vaConfig.targetClassification
                          : true // topic.classification があるのに topicClassification がないものは全て対象
                        : state.vaConfig.targetClassification === "all" // topic に classification がないものは all 設定以外は対象外
                  )
                  // 当該Assistantの Category 対象トピックか
                  .filter(
                    (agenda) =>
                      agenda.category
                        ? state.vaConfig.targetCategory
                          ? state.vaConfig.targetCategory === "Unknown" ||
                            agenda.category === state.vaConfig.targetCategory
                          : true // topic.category があるのに topicCategory がないものは全て対象
                        : state.vaConfig.targetCategory === "Unknown" // topic に category がないものは Unknown 設定以外は対象外
                  )
                  // agenda 毎に 関連 topic をすべて抽出
                  .forEach((agenda) => {
                    topics = vfState.topics.filter(
                      (topic) =>
                        topic.seedData &&
                        topic.seedData?.agendaIdList?.includes(agenda.id) &&
                        targetTopicIndex >= vfState.topics.indexOf(topic) // targetTopic 以前の topic のみ
                    );

                    // = 3. Assistantを呼び出す =
                    if (topics.length > 0) {
                      currentAttachOption = currentAttachOption ?? {
                        attachment: "topic",
                        target: "systemFiltered",
                      };

                      let paramToInvoke: any = {
                        basePrompt: updatePrompt,
                        topics,
                        attachOption: currentAttachOption,
                      };
                      if (
                        state.vaConfig.aiConfig.structuredOutputSchema &&
                        state.vaConfig.aiConfig.reactComponent
                      ) {
                        paramToInvoke = {
                          ...paramToInvoke,
                          customField: {
                            ...paramToInvoke.customField,
                            STRUCTURED_OUTPUT_SCHEMA:
                              state.vaConfig.aiConfig.structuredOutputSchema,
                            REACT_COMPONENT:
                              state.vaConfig.aiConfig.reactComponent,
                          },
                        };
                      }
                      reqQueue.push(
                        makeTopicOrientedInvokeParam(paramToInvoke)
                      );
                    }
                  });

                if (reqQueue.length > 0) {
                  /*
            console.log(
              "enqueueTopicRelatedInvoke: at updated: 1",
              targetTopic.title,
              reqQueue
            );
            */
                  dispatch({
                    type: "invokeAssistant",
                    payload: {
                      queue: reqQueue,
                    },
                  });
                }
              }
            } else if (updateMode === "at_agenda_completed") {
              // Agenda終了の判定
              const endedAgendaMap = new Map<number, string[]>(); // TopicのIndexをKeyに、当該Indexに終了したAgendaのIDをValueに持つ

              // agenda が終了しているなら map idと終了時間が入る
              const agendaEndTimeMap = new Map<string, number>(
                getAllAgendas()
                  .map((agenda) => {
                    // agenda に複数の終了時間がある場合、最も遅い時間を採用
                    const lastDiscussedTime = agenda.discussedTimes
                      .flatMap(
                        (discussedTime) => discussedTime.endFromMStartMsec
                      )
                      .sort((a, b) => b - a)
                      .at(0);
                    if (lastDiscussedTime) {
                      return {
                        agenda,
                        lastDiscussedTime: lastDiscussedTime / 1000,
                      };
                    }
                  })
                  .filter((elem) => !!elem)
                  .map(({ agenda, lastDiscussedTime }) => [
                    agenda.id,
                    lastDiscussedTime,
                  ])
              );

              /*
              console.log(
                "enqueueTopicRelatedInvoke: at_agenda_completed: agendaEndTimeMap",
                agendaEndTimeMap
              );
              */

              // FIXME:
              // 以下のロジックはTopicが生成されていく途中で、Agendaの終了が判定される前なら動作する
              // しかし、Topicの再構築を行うと、Agendaがすでに終了済みになっているため、結果的にAgenda毎にTopicの更新時に呼び出されることになる
              // この場合に対応するには、Agendaに時間データが保存されているかどうかを確認する必要がある。
              vfState.topics.forEach((topic, index, topics) => {
                // 原則：　終了した agenda はないと考える
                endedAgendaMap.set(index, []);

                // 例外判定
                const agendaIds = topic.seedData?.agendaIdList ?? [];
                if (index > 0) {
                  //const completedAgendaIds = [];
                  const bfAgendaIds =
                    topics[index - 1].seedData?.agendaIdList ?? [];
                  if (bfAgendaIds.length > 0) {
                    // 前のトピックの agenda がある場合
                    if (agendaIds.length > 0) {
                      // 今のトピックの agenda がある場合
                      const endedAgendas = bfAgendaIds.filter(
                        (agendaId) => !agendaIds.includes(agendaId)
                      );
                      if (endedAgendas.length > 0) {
                        endedAgendaMap.set(index - 1, endedAgendas);
                      }
                    } else {
                      // 現在の topic に agendaが結びつかないなら、前のトピックはすべて終了したとみなす
                      endedAgendaMap.set(index - 1, bfAgendaIds);
                    }
                  }
                }
                // 最終要素の agenda のstateが終わっているなら、その agenda は最終要素で終了している
                if (index === topics.length - 1 && agendaIds.length > 0) {
                  const lastEnded: string[] = [];
                  agendaIds.forEach((agendaId) => {
                    const agenda = getAgenda(agendaId);
                    const agendaEndTime = agendaEndTimeMap.get(agendaId);
                    /*
                    console.log(
                      "enqueueTopicRelatedInvoke: at_agenda_completed: last topic: agenda: 1",
                      agenda,
                      agendaEndTime,
                      topic.seedData?.endTimestamp
                    );
                    */
                    if (
                      agenda &&
                      (agenda.status === "done" ||
                        agenda.status === "mayBeDone") &&
                      agendaEndTime &&
                      topic.seedData?.endTimestamp != undefined &&
                      agendaEndTime <= topic.seedData?.endTimestamp // この部分は必要。Topicは逐次処理なので、最新のTopicは常に最終要素。あくまでもAgenda終了時間で判断するしかない。会議全体の最終の判断は、別で行う必要がある。
                    ) {
                      lastEnded.push(agendaId);
                    }
                  });
                  if (lastEnded.length > 0) {
                    endedAgendaMap.set(
                      index,
                      endedAgendaMap.get(index)!.concat(lastEnded)
                    );
                  }
                }
              });

              /*
              console.log(
                "enqueueTopicRelatedInvoke: at_agenda_completed: endedAgendaMap",
                endedAgendaMap
              );
              */

              // 未解決対象の抽出
              const reqQueue: Array<Message> = [];
              vfState.topics.forEach((topic, index) => {
                const endedAgenda = endedAgendaMap.get(index);
                if (
                  endedAgenda != undefined &&
                  endedAgenda.length! > 0 &&
                  !resolvedTopicIDs.includes(topic.id!)
                ) {
                  endedAgenda
                    .map((agendaId) => getAgenda(agendaId))
                    .filter((agenda) => agenda !== undefined)
                    // 当該Assistantの Classification 対象トピックか
                    .filter(
                      (agenda) =>
                        agenda.classification
                          ? state.vaConfig.targetClassification
                            ? state.vaConfig.targetClassification === "all" ||
                              agenda.classification ===
                                state.vaConfig.targetClassification
                            : true // topic.classification があるのに topicClassification がないものは全て対象
                          : state.vaConfig.targetClassification === "all" // topic に classification がないものは all 設定以外は対象外
                    )
                    // 当該Assistantの Category 対象トピックか
                    .filter(
                      (agenda) =>
                        agenda.category
                          ? state.vaConfig.targetCategory
                            ? state.vaConfig.targetCategory === "Unknown" ||
                              agenda.category === state.vaConfig.targetCategory
                            : true // topic.category があるのに topicCategory がないものは全て対象
                          : state.vaConfig.targetCategory === "Unknown" // topic に category がないものは Unknown 設定以外は対象外
                    )
                    // agenda 毎に 関連 topic をすべて抽出
                    .forEach((agenda) => {
                      topics = vfState.topics.filter(
                        (topic) =>
                          topic.seedData &&
                          topic.seedData?.agendaIdList?.includes(agenda.id)
                      );

                      // = 3. Assistantを呼び出す =
                      currentAttachOption = currentAttachOption ?? {
                        attachment: "topic",
                        target: "systemFiltered",
                      };

                      let paramToInvoke: any = {
                        basePrompt: updatePrompt,
                        topics,
                        attachOption: currentAttachOption,
                      };
                      if (
                        state.vaConfig.aiConfig.structuredOutputSchema &&
                        state.vaConfig.aiConfig.reactComponent
                      ) {
                        paramToInvoke = {
                          ...paramToInvoke,
                          customField: {
                            ...paramToInvoke.customField,
                            STRUCTURED_OUTPUT_SCHEMA:
                              state.vaConfig.aiConfig.structuredOutputSchema,
                            REACT_COMPONENT:
                              state.vaConfig.aiConfig.reactComponent,
                          },
                        };
                      }
                      reqQueue.push(
                        makeTopicOrientedInvokeParam(paramToInvoke)
                      );
                    });
                }
              });

              if (reqQueue.length > 0) {
                /*
                console.log(
                  "enqueueTopicRelatedInvoke: at_agenda_completed: invokeAssistant",
                  reqQueue
                );
                */
                dispatch({
                  type: "invokeAssistant",
                  payload: {
                    queue: reqQueue,
                  },
                });
              }
            }
          }
        },

        // invokeQueue に積まれたQueueを処理する。 subscribe で呼び出される
        // 時間のかかる「同期」関数：　敢えて set まで完全に同期させることで transaction を保証する
        processInvoke: (vaConfig) => {
          if (!minutesStartTimestamp || !get()._hasHydrated) {
            console.warn("processInvoke: not loaded", vaConfig.label);
            return;
          }
          const state = get().getOrInitAssistant(vaConfig);
          if (!state.loaded) {
            console.warn("processInvoke: not loaded", vaConfig.label, state);
            return;
          }
          if (state.invokeQueue.length == 0) {
            console.warn(
              "processInvoke: invokeQueue is empty",
              vaConfig.label,
              state
            );
            return;
          }
          if (state.onProcess) {
            console.warn("processInvoke: on process", vaConfig.label, state);
            return;
          }

          // ここまでのガード条件で、必ず hydrate が完了しているので、以下は set() での更新が可能
          const targetMessage = state.invokeQueue[0];
          const invokeQueue = state.invokeQueue.slice(1);

          let param = {};
          let jsonType;
          let connectedMessageIds: string[] = [];
          if (targetMessage) {
            connectedMessageIds = targetMessage.connectedMessageIds;

            param = {
              content: targetMessage.content,
              customField: targetMessage.customField,
              systemPrompt: vaConfig.initialPrompt,
            };

            if (targetMessage.customField?.type == "MindMap") {
              jsonType = "MindMap";
            }

            // 処理開始を記録
            const startState = {
              ...state,
              onProcess: true,
              resolvingQueue: targetMessage,
            };
            set(
              produce((state: AssistantsStateStore) => {
                state.assistantsMap.set(vaConfig.assistantId, startState);
              })
            );
            console.warn(
              "processInvoke: start",
              vaConfig.label,
              get().assistantsMap.get(vaConfig.assistantId)
            );

            window.electron
              .invoke(
                IPCInvokeKeys.LANGCHAIN_ASSISTANT_INVOKE,
                param,
                minutesStartTimestamp,
                vaConfig.assistantName,
                vaConfig.assistantId,
                connectedMessageIds,
                vaConfig.aiConfig.modelType,
                jsonType,
                vaConfig.aiConfig.difyConf,
                vaConfig.aiConfig.flowiseConf,
                vaConfig.aiConfig.langGraphConf,
                vaConfig.aiConfig.structuredOutputSchema,
                vaConfig.aiConfig.attachHistoryLimit
              )
              .then((res) => res as InvokeResult)
              .then((res) => {
                const message = res.message;
                message.agendaIds = targetMessage.agendaIds; // FIXME: agendaIds　が seed から引き回されていない！！

                console.log(
                  "processInvoke: Invoke result:",
                  message,
                  targetMessage
                );

                const newState: AssistantState = {
                  ...state,
                  invokeQueue: invokeQueue,
                  messages: [...(state.messages ?? []), message], // メッセージのインスタンスは残さないと後々判定できない
                  messagesWithInvoked: [
                    ...(state.messagesWithInvoked ?? []),
                    message,
                  ],
                  req: undefined,
                  onProcess: false,
                  resolvingQueue: undefined,
                  attachment: "none" as AttachmentMode,
                };

                set(
                  produce((state: AssistantsStateStore) => {
                    state.assistantsMap.set(vaConfig.assistantId, newState);
                  })
                );
                console.warn(
                  "processInvoke: end",
                  vaConfig.label,
                  get().assistantsMap.get(vaConfig.assistantId)
                );
              })
              .catch((e) => {
                // エラー時も非同期処理後に状態を再度更新
                const errorMessage = getDefaultMessage();
                errorMessage.content = "Assistant invoke error";
                errorMessage.error = e instanceof Error ? e.message : String(e);
                errorMessage.connectedMessageIds = connectedMessageIds;

                console.log("processInvoke: Invoke error:", errorMessage);
                const newState: AssistantState = {
                  ...state,
                  invokeQueue: invokeQueue,
                  messages: [...(state.messages ?? []), errorMessage], // メッセージのインスタンスは残さないと後々判定できない
                  messagesWithInvoked: [
                    ...(state.messagesWithInvoked ?? []),
                    errorMessage,
                  ],
                  req: undefined,
                  onProcess: false,
                  resolvingQueue: undefined,
                  attachment: "none" as AttachmentMode,
                };

                set(
                  produce((state: AssistantsStateStore) => {
                    state.assistantsMap.set(vaConfig.assistantId, newState);
                  })
                );
              });
          }
        },
      })),
      {
        name: minutesStartTimestamp.toString(),
        storage: createJSONStorage(
          () => AssistantPersistStorage,
          ExpandJSONOptions
        ),
        onRehydrateStorage: (state) => {
          return (state, error) => {
            if (error) {
              console.error("an error happened during hydration", error);
            } else if (state) {
              state._setHasHydrated(true);
              console.log("useAssistantsStoreCore: rehydrated", state);
            }
          };
        },
      }
    )
  );
};

// === subscribe ===

// minutes 変更時
let unsubscribeProcessInvoke: (() => void) | null = null;
useVFStore.subscribe(
  (state) => {
    return {
      startTimestamp: state.startTimestamp,
      assistants: state.assistants,
    };
  },
  (state) => {
    const minutesStartTimestamp = state.startTimestamp;
    if (minutesStartTimestamp != null) {
      const assistantsStore = useMinutesAssistantStore(minutesStartTimestamp);
      state.assistants.forEach((vaConfig) => {
        // minute変更
        if (assistantsStore.getState()._hasHydrated) {
          const assistantState = assistantsStore
            .getState()
            .getOrInitAssistant(vaConfig);
          assistantsStore.getState().assistantDispatch(vaConfig)({
            type: "changeMinutes",
            payload: {
              startTimestamp: minutesStartTimestamp,
              assistantName: vaConfig.assistantName,
              messages: assistantState.messages,
              messagesWithInvoked: assistantState.messagesWithInvoked,
            },
          });
        }
      });

      // queue invoke 処理
      if (unsubscribeProcessInvoke) {
        unsubscribeProcessInvoke();
      }
      unsubscribeProcessInvoke = assistantsStore.subscribe(
        (assistantState) => {
          return {
            startTimestamp: minutesStartTimestamp,
            assistantMap: assistantState.assistantsMap,
            hydrated: assistantState._hasHydrated,
          };
        },
        (state) => {
          if (state.hydrated) {
            Array.from(state.assistantMap.values())
              .filter(
                (assistant) =>
                  assistant.invokeQueue.length > 0 && !assistant.onProcess
              )
              .forEach(
                (assistant) => {
                  assistantsStore.getState().processInvoke(assistant.vaConfig);
                } // 同期関数でrequest => response まで処理
              );
          }
        },
        {
          equalityFn: (prev, next) => {
            return !(
              next.hydrated &&
              Array.from(next.assistantMap.values()).some(
                (nextAssistant) => nextAssistant.invokeQueue.length > 0
              )
            );
          },
        }
      );
    }
  },
  {
    equalityFn: (prev, next) => {
      return prev.startTimestamp === next.startTimestamp;
    },
  }
);

// mode 変更時
useVFStore.subscribe(
  (state) => {
    return {
      startTimestamp: state.startTimestamp,
      assistants: state.assistants,
      mode: state.mode,
    };
  },
  (state) => {
    if (state.startTimestamp != null && state.mode === "home") {
      const assistantsStore = useMinutesAssistantStore(state.startTimestamp);
      state.assistants.forEach((vaConfig) => {
        if (!assistantsStore.getState()._hasHydrated) return;
        assistantsStore.getState().assistantDispatch(vaConfig)({
          type: "clearAll",
        });
      });
    }
  },
  {
    equalityFn: (prev, next) => prev.mode === next.mode,
  }
);

// assistants 変更時: enqueue
useVFStore.subscribe(
  (state) => {
    return {
      startTimestamp: state.startTimestamp,
      assistants: state.assistants,
      lastAction: state.lastAction,
    };
  },
  (state) => {
    if (
      state.startTimestamp &&
      state.lastAction &&
      (state.lastAction.type === "addVirtualAssistantConf" ||
        state.lastAction.type === "setVirtualAssistantConf" ||
        state.lastAction.type === "removeVirtualAssistantConf")
    ) {
      /*
      console.warn(
        "useAssistantsStore: useVFStore.subscribe: assistants",
        state.startTimestamp,
        state.lastAction.type
      );
      */
      const assistantsStore = useMinutesAssistantStore(state.startTimestamp);
      switch (state.lastAction.type) {
        case "addVirtualAssistantConf":
          assistantsStore
            .getState()
            .getOrInitAssistant(state.lastAction.payload.assistant);
        // break しないで　setVirtualAssistantConfと同様の処理へ
        case "setVirtualAssistantConf":
          assistantsStore
            .getState()
            .enqueueTopicRelatedInvoke(state.lastAction.payload.assistant);
          break;
        case "removeVirtualAssistantConf":
          assistantsStore
            .getState()
            .removeAssistant(state.lastAction.payload.assistantId);
          break;
      }
    }
  },
  {
    equalityFn: (prev, next) => {
      if (
        next.lastAction &&
        (next.lastAction.type === "addVirtualAssistantConf" ||
          next.lastAction.type === "setVirtualAssistantConf" ||
          next.lastAction.type === "removeVirtualAssistantConf")
      ) {
        return false;
      }
      return true;
    },
  }
);

// Topicの変化： Topic をトリガーにした Assistant の Invoke をキューに積む
useVFStore.subscribe(
  (state) => {
    return {
      startTimestamp: state.startTimestamp,
      topics: state.topics,
      assistants: state.assistants,
    };
  },
  (state) => {
    if (state.startTimestamp) {
      const assistantsStore = useMinutesAssistantStore(state.startTimestamp);
      state.assistants.forEach((vaConfig) => {
        assistantsStore.getState().enqueueTopicRelatedInvoke(vaConfig);
        /*
        console.warn(
          "useAssistantsStore: useVFStore.subscribe: topic",
          vaConfig.label,
          assistantsStore.getState().assistantsMap.get(vaConfig.assistantId)
            ?.invokeQueue
        );
        */
      });
    }
  },
  {
    equalityFn: (prev, next) => {
      if (
        prev.topics !== next.topics ||
        prev.topics.length !== next.topics.length
      ) {
        return false;
      }
      return true;
    },
  }
);

// == Assistant Template ==
export type AssistantTemplate = {
  templateId: string;
  description: string;
  author: string;
  config: VirtualAssistantConf;
};
