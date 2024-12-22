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
import { createStore, del, get, set } from "idb-keyval";
import { ExpandJSONOptions, HydrateState } from "./IDBKeyValPersistStorage.jsx";
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
  getDefaultMessage,
  InvokeResult,
  Message,
  TargetCategory,
  TargetClassification,
} from "../../../common/content/assisatant.js";
import { detectVAMessageType } from "../component/assistant/message/detectVAMessageType.jsx";
import { AIConfig } from "../component/common/aiConfig.jsx";
import { isTopic, Topic, TopicSeed } from "../../../common/content/topic.js";
import { Content, isContent } from "../../../common/content/content.js";
import { useMinutesAgendaStore } from "./useAgendaStore.jsx";
import { useVBStore } from "./useVBStore.jsx";
import { useMinutesStore } from "./useMinutesStore.jsx";
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
    //console.log("AssistantPersistStorage.setItem:", name);
    await set(name, value, assistantIDBStore);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name, assistantIDBStore);
  },
};

// === State / Dispatch ===

export type AssistantTemplate = {
  templateId: string;
  description: string;
  author: string;
  config: VirtualAssistantConf;
};

export type VirtualAssistantUpdateMode =
  | "manual"
  | "at_topic_updated"
  | "at_agenda_updated"
  | "at_agenda_completed";
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
  // messages
  messages?: Array<Message>;
  messagesWithInvoked?: Array<Message>; // invoke message も含めたヒストリー形式での表示用のメッセージ
  // request to assistant
  onProcess: boolean;
  invokeQueue: Message[];
  resolvingQueue?: Message;
  //req?: AssistantAction;
};

export const initAssistantState = (
  vaConfig: VirtualAssistantConf
): AssistantState => {
  return {
    attachment: "none",
    onProcess: false,
    vaConfig: vaConfig,
    invokeQueue: [],
    messages: [],
    messagesWithInvoked: [],
    //req: undefined,
    resolvingQueue: undefined,
  };
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

  const startTimestamp = useVBStore.getState().startTimestamp;
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
    .map((id) => useMinutesAgendaStore(startTimestamp).getState().getAgenda(id))
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

  const startTimestamp = useVBStore.getState().startTimestamp;
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
    .map((id) => useMinutesAgendaStore(startTimestamp).getState().getAgenda(id))
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

const storeCache = new Map<number, ReturnType<typeof useAssistantsStoreCore>>();
export const useMinutesAssistantStore = (minutesStartTimestamp: number) => {
  let newStore;
  if (storeCache.has(minutesStartTimestamp)) {
    newStore = storeCache.get(minutesStartTimestamp)!;
  } else {
    newStore = useAssistantsStoreCore(minutesStartTimestamp);
    storeCache.set(minutesStartTimestamp, newStore);
  }
  return newStore;
};

export type AssistantsStateStore = {
  assistantsMap: Map<string, AssistantState>;
};

export type AssistantsDispatchStore = {
  getOrInitAssistant: (vaConfig: VirtualAssistantConf) => AssistantState;
  setAssistant: (assistant: AssistantState) => void;
  removeAssistant: (assistantId: string) => void;
  enqueueTopicRelatedInvoke: (vaConfig: VirtualAssistantConf) => void;
  processInvoke: (vaConfig: VirtualAssistantConf) => void;

  // dispatch
  invokeAssistant: (
    vaConfig: VirtualAssistantConf,
    payload: { queue: Array<Message> }
  ) => void;
  processRejected: (vaConfig: VirtualAssistantConf) => void;
  appendFunctionalMessage: (
    vaConfig: VirtualAssistantConf,
    payload: {
      message: Message;
      startTimestamp: number;
      assistantName: string;
    }
  ) => void;
  initialize: (
    vaConfig: VirtualAssistantConf,
    payload: {
      startTimestamp: number;
      assistantName: string;
    }
  ) => void;
  removeMessage: (
    vaConfig: VirtualAssistantConf,
    payload: { messageId: string }
  ) => void;
  clearAll: (vaConfig: VirtualAssistantConf) => void;
  setAttachment: (
    vaConfig: VirtualAssistantConf,
    payload: { attachmentMode: AttachmentMode }
  ) => void;
  updateMessage: (
    vaConfig: VirtualAssistantConf,
    payload: { messages: Array<Message> }
  ) => void;
};

const useAssistantsStoreCore = (minutesStartTimestamp: number) => {
  console.log("useAssistantsStoreCore", minutesStartTimestamp);
  let unsubscribeMindMapCreated: () => void;
  return create<
    AssistantsStateStore & AssistantsDispatchStore & HydrateState
  >()(
    persist(
      subscribeWithSelector((set, get, api) => ({
        // Hydrate
        hasHydrated: false,
        setHasHydrated: (state) => {
          set({
            hasHydrated: state,
          });
        },
        waitForHydration: async () => {
          const store = get();
          if (store.hasHydrated) {
            return Promise.resolve();
          }
          return new Promise<void>((resolve) => {
            const unsubscribe = api.subscribe(
              (state) => state.hasHydrated,
              (hasHydrated) => {
                if (hasHydrated) {
                  unsubscribe();
                  resolve();
                }
              }
            );
          });
        },

        // State
        assistantsMap: new Map<string, AssistantState>(),

        // Dispatch
        setAssistant: (assistant) => {
          if (!useVBStore.getState().allReady) return;
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
          if (!useVBStore.getState().allReady) return;
          set(
            produce((state: AssistantsStateStore) => {
              state.assistantsMap.delete(assistantId);
            })
          );
        },

        getOrInitAssistant: (vaConfig): AssistantState => {
          if (!useVBStore.getState().allReady)
            throw new Error("getOrInitAssistant: stores not hydrated");

          try {
            // listener to make Mind Map
            if (unsubscribeMindMapCreated) unsubscribeMindMapCreated();
            unsubscribeMindMapCreated = window.electron.on(
              IPCReceiverKeys.ON_MIND_MAP_CREATED,
              (event: any, mindMap: InvokeResult) =>
                get().appendFunctionalMessage(vaConfig, {
                  startTimestamp: mindMap.startTimestamp,
                  assistantName: mindMap.assistantName,
                  message: mindMap.message,
                })
            );

            const { assistantsMap } = get();
            // 既存のアシスタントを取得、または新たに初期化して設定
            let target = assistantsMap.get(vaConfig.assistantId);
            if (!target) {
              target = initAssistantState(vaConfig);
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

        enqueueTopicRelatedInvoke: (vaConfig) => {
          if (!useVBStore.getState().allReady) return;
          const assistantConfig = vaConfig;
          const startTimestamp = useVBStore.getState().startTimestamp;
          const state = get().getOrInitAssistant(vaConfig);
          const minutesState = useMinutesStore(startTimestamp).getState();
          const { updateMode, attachOption, updatePrompt } = assistantConfig;
          if (
            updateMode != "manual" // 手動更新モードでない
          ) {
            const getAgenda =
              useMinutesAgendaStore(startTimestamp).getState().getAgenda;
            const getAllAgendas =
              useMinutesAgendaStore(startTimestamp).getState().getAllAgendas;
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
              // invokeQueue にある invokeParam の topic も解消済みとみなす。 必ず 1つずつinvokeされている前提
              ...state.invokeQueue
                .filter((param) => param.connectedMessageIds)
                .map((param) => param.connectedMessageIds!)
                .flat(),
            ]; // id重複をあえて許容

            if (updateMode === "at_topic_updated") {
              // = 1. 対象トピックの抽出 =
              let ccFilteredTopics: Topic[] = []; // classification, category でフィルタリングされたトピック
              ccFilteredTopics = minutesState.topics
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
                console.log(
                  "enqueueTopicRelatedInvoke: at updated",
                  vaConfig.label,
                  resolvedTopicIDs,
                  ccFilteredTopics,
                  filteredTopics,
                  reqQueue,
                  get().getOrInitAssistant(vaConfig).invokeQueue
                );

                get().invokeAssistant(vaConfig, { queue: reqQueue });
              }
            } else if (updateMode === "at_agenda_updated") {
              // = 1. 対象の抽出 =
              const agendaFilteredTopics = minutesState.topics
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
                const targetTopicIndex =
                  minutesState.topics.indexOf(targetTopic);
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
                    topics = minutesState.topics.filter(
                      (topic) =>
                        topic.seedData &&
                        topic.seedData?.agendaIdList?.includes(agenda.id) &&
                        targetTopicIndex >= minutesState.topics.indexOf(topic) // targetTopic 以前の topic のみ
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
                  get().invokeAssistant(vaConfig, { queue: reqQueue });
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
              minutesState.topics.forEach((topic, index, topics) => {
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
              minutesState.topics.forEach((topic, index) => {
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
                      topics = minutesState.topics.filter(
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
                get().invokeAssistant(vaConfig, { queue: reqQueue });
              }
            }
          }
        },

        // invokeQueue に積まれたQueueを処理する。 subscribe で呼び出される
        processInvoke: async (vaConfig) => {
          if (useVBStore.getState().isNoMinutes()) {
            console.warn("no minutes", vaConfig.label);
            return;
          }
          if (!useVBStore.getState().allReady) {
            console.warn("processInvoke: stores not loaded", vaConfig.label);
            return;
          }

          let state = get().getOrInitAssistant(vaConfig);

          if (state.onProcess) {
            console.warn("processInvoke: on process", vaConfig.label, state);
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
          // 排他処理を行うために、早めに onProcess を立てる
          set(
            produce((storeState: AssistantsStateStore) => {
              storeState.assistantsMap.set(vaConfig.assistantId, {
                ...state,
                onProcess: true,
              });
            })
          );

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
            state = get().getOrInitAssistant(vaConfig);
            /*
            console.log(
              "processInvoke: start",
              vaConfig.label,
              get().assistantsMap.get(vaConfig.assistantId)
            );
            */

            try {
              const res: InvokeResult = await window.electron.invoke(
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
              );

              const message = res.message;
              message.agendaIds = targetMessage.agendaIds; // FIXME: agendaIds　が seed から引き回されていない！！

              const newState: AssistantState = {
                ...state,
                invokeQueue: invokeQueue,
                messages: [...(state.messages ?? []), message], // メッセージのインスタンスは残さないと後々判定できない
                messagesWithInvoked: [
                  ...(state.messagesWithInvoked ?? []),
                  message,
                ],
                //req: undefined,
                onProcess: false, // fixme: map の場合には onProcess が続いている
                resolvingQueue: undefined,
                attachment: "none" as AttachmentMode,
              };

              set(
                produce((state: AssistantsStateStore) => {
                  state.assistantsMap.set(vaConfig.assistantId, newState);
                })
              );
              /*
              console.log(
                "processInvoke: end",
                vaConfig.label,
                get().assistantsMap.get(vaConfig.assistantId),
                targetMessage
              );
              */
            } catch (e) {
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
                onProcess: false,
                resolvingQueue: undefined,
                attachment: "none" as AttachmentMode,
              };

              set(
                produce((state: AssistantsStateStore) => {
                  state.assistantsMap.set(vaConfig.assistantId, newState);
                })
              );
            }
          }
        },

        // == dispatch ===

        invokeAssistant(vaConfig, payload) {
          if (!useVBStore.getState().allReady) return;
          const state = get().getOrInitAssistant(vaConfig);
          const invokeQueue = [...state.invokeQueue, ...payload.queue];
          const messagesWithInvoked = [
            ...(state.messagesWithInvoked ?? []),
            ...payload.queue,
          ];
          get().setAssistant({
            ...state,
            invokeQueue,
            messagesWithInvoked,
          });
        },

        processRejected(vaConfig) {
          if (!useVBStore.getState().allReady) return;
          const state = get().getOrInitAssistant(vaConfig);
          get().setAssistant({
            ...state,
            attachment: "none",
            onProcess: false,
            resolvingQueue: undefined,
          });
        },

        appendFunctionalMessage(vaConfig, payload) {
          if (!useVBStore.getState().allReady) return;
          if (
            payload.startTimestamp == minutesStartTimestamp &&
            payload.assistantName == vaConfig.assistantName
          ) {
            const state = get().getOrInitAssistant(vaConfig);
            get().setAssistant({
              ...state,
              messages: [...(state.messages ?? []), payload.message], // メッセージのインスタンスは残さないと後々判定できない
              messagesWithInvoked: [
                ...(state.messagesWithInvoked ?? []),
                payload.message,
              ],
              attachment: "none" as AttachmentMode,
            });
          }
        },

        initialize(vaConfig, payload) {
          if (!useVBStore.getState().allReady) return;
          // 定義済みの専用Treadを削除して新しいThreadを作成する。　⇒　正常時は changeMinutes　が最後に呼ばれて終了する
          if (
            payload.startTimestamp == minutesStartTimestamp &&
            payload.assistantName == vaConfig.assistantName
          ) {
            get().setAssistant({
              ...initAssistantState(vaConfig),
              messages: [],
              messagesWithInvoked: [],
              onProcess: false,
            });
            get().enqueueTopicRelatedInvoke(vaConfig); // 並行処理
          }
        },

        removeMessage(vaConfig, payload) {
          if (!useVBStore.getState().allReady) return;
          const state = get().getOrInitAssistant(vaConfig);
          const targetIndex =
            (state.messages ?? []).findIndex(
              (value) => value.id === payload.messageId
            ) ?? -1;
          if (targetIndex >= 0) {
            let newState = {
              ...state,
              messages: [
                ...(state.messages ?? []).slice(0, targetIndex),
                ...(state.messages ?? []).slice(targetIndex + 1),
              ],
            };

            const targetIndexWithInvoked = (
              state.messagesWithInvoked ?? []
            ).findIndex((value) => value.id === payload.messageId);

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

            get().setAssistant(newState);
          }
        },

        clearAll(vaConfig) {
          if (!useVBStore.getState().allReady) return;
          get().setAssistant(initAssistantState(vaConfig));
        },

        setAttachment(vaConfig, payload) {
          if (!useVBStore.getState().allReady) return;
          get().setAssistant({
            ...get().getOrInitAssistant(vaConfig),
            attachment: payload.attachmentMode,
          });
        },

        updateMessage(vaConfig, payload) {
          if (!useVBStore.getState().allReady) return;
          const state = get().getOrInitAssistant(vaConfig);

          let newMessages = [...(state.messages ?? [])];
          let newMessagesWithInvoked = [...(state.messagesWithInvoked ?? [])];
          payload.messages.forEach((message) => {
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
          const newState = {
            ...state,
            messages: newMessages,
            messagesWithInvoked: newMessagesWithInvoked,
          };

          get().setAssistant(newState);
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
              console.error(
                "an error happened during hydration",
                minutesStartTimestamp,
                error
              );
            } else if (state) {
              state.setHasHydrated(true);
              useVBStore.getState().setHydrated("assistant");
              console.log(
                "useAssistantsStoreCore: rehydrated",
                minutesStartTimestamp,
                state
              );
            }
          };
        },
      }
    )
  );
};
