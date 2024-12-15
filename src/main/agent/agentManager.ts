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
import { z } from "zod";
import { IPCInvokeKeys } from "../../common/constants.js";
// LangChain
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import {
  BaseMessagePromptTemplateLike,
  ChatPromptTemplate,
} from "@langchain/core/prompts";

import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatGroq } from "@langchain/groq";
import { ChatOpenAI, ChatOpenAICallOptions } from "@langchain/openai";

// Virtual Assistant
import Store from "electron-store";
import { AgentDify } from "./agentDify.js";
import { AgentFlowise } from "./agentFlowise.js";
import {
  DifyConf,
  FlowiseConf,
  getDefaultMessage,
  InvokeResult,
  LangGraphConf,
  MindMapSchema,
  ModelType,
  TopicInvokeParam,
  TopicZodSchema,
  VAMessageConf,
} from "../../common/agentManagerDefinition.js";

import { isBaseMessage } from "@langchain/core/messages";
import { v4 as uuidv4 } from "uuid";
import { LLMAnalyzedTopics } from "../../renderer/views/component/topic/useTopicManager.js";
import { AgentLangGraph } from "./agentLangGraph.js";

export class AgentManager {
  // environment
  private _ipcMain: Electron.IpcMain;
  private _store: Store<StoreType>;

  constructor({
    ipcMain,
    store,
  }: {
    ipcMain: Electron.IpcMain;
    store: Store<StoreType>;
  }) {
    this._ipcMain = ipcMain;
    this._store = store;
    this._initialize();
  }

  // common

  private __constructModel(
    props: TopicInvokeParam
  ):
    | ChatGroq
    | ChatAnthropic
    | ChatGoogleGenerativeAI
    | ChatOpenAI<ChatOpenAICallOptions>
    | AgentDify
    | AgentFlowise
    | AgentLangGraph {
    const { modelType, temperature } = props;
    // model
    let model;
    switch (modelType) {
      case "llama3":
        model = new ChatGroq({
          apiKey: this._store.get("conf").GROQ_API_KEY,
          temperature: temperature ?? 0,
          modelName: "llama3-70b-8192",
          maxRetries: 3,
        });
        break;
      case "claude-3-opus":
        model = new ChatAnthropic({
          apiKey: this._store.get("conf").ANTHROPIC_API_KEY,
          temperature: temperature ?? 0,
          modelName: "claude-3-opus-20240229",
          maxRetries: 3,
        });
        break;
      case "claude-3-sonnet":
        model = new ChatAnthropic({
          apiKey: this._store.get("conf").ANTHROPIC_API_KEY,
          temperature: temperature ?? 0,
          modelName: "claude-3-sonnet-20240229",
          maxRetries: 3,
        });
        break;
      case "gpt-4":
        model = new ChatOpenAI({
          apiKey: this._store.get("conf").OPENAI_API_KEY,
          temperature: temperature ?? 0,
          modelName: "gpt-4o",
          maxRetries: 3,
        });
        break;
      case "gpt-3.5":
        model = new ChatOpenAI({
          apiKey: this._store.get("conf").OPENAI_API_KEY,
          temperature: temperature ?? 0,
          modelName: "gpt-3.5-turbo-0125",
          maxRetries: 3,
        });
        break;
      case "gemini-1.5-pro":
        model = new ChatGoogleGenerativeAI({
          apiKey: this._store.get("conf").GOOGLE_API_KEY,
          temperature: temperature ?? 0,
          modelName: "gemini-1.5-pro-latest",
          maxRetries: 3,
        });
        break;
      case "dify":
        model = new AgentDify({
          url: props.difyConf?.serverUrl ?? "",
          apiKey: props.difyConf?.apiKey ?? "",
        });
        break;
      case "flowise":
        model = new AgentFlowise({
          chatFlowID: props.flowiseConf?.chatFlowID ?? "",
          apiKey: props.flowiseConf?.apiKey ?? "",
        });
        break;
      case "langGraph":
        model = new AgentLangGraph({
          store: this._store,
          langGraphID: props.langGraphConf?.langGraphID ?? "",
          // 毎回のリクエストで新しいインスタンスを作成するため、生成用パラメータはここで渡す
          invokeParams: {
            context: props.field?.CONTEXT,
            agendaContext: props.field?.AGENDA_CONTEXT,
            agendas: props.field?.AGENDAS,
          },
        });
        break;
      default:
      case "gemini-1.5-flash":
        model = new ChatGoogleGenerativeAI({
          apiKey: this._store.get("conf").GOOGLE_API_KEY,
          temperature: temperature ?? 0,
          modelName: "gemini-1.5-flash-latest",
          maxRetries: 3,
        });
        break;
    }
    return model;
  }

  // == Topic ==

  private async _invokeTopic(
    props: TopicInvokeParam
  ): Promise<LLMAnalyzedTopics> {
    return new Promise(async (resolve, reject) => {
      try {
        const { inputPrompt, systemPrompt, structuredOutputSchema } = props;
        // prompt
        const prompt = systemPrompt
          ? ChatPromptTemplate.fromMessages([
              ["system", systemPrompt], // このプロンプトに {format_instructions} が含まれる
              ["human", "{input}"],
            ])
          : ChatPromptTemplate.fromMessages([["human", "{input}"]]);

        // model
        const model = this.__constructModel(props);

        // output
        const output = StructuredOutputParser.fromZodSchema(TopicZodSchema);

        const inputParam = {
          input: inputPrompt,
          format_instructions: output.getFormatInstructions(),
        };
        //console.log("_invokeTopic: prompt::", await prompt.format(inputParam));

        // invoke
        prompt
          .pipe(model)
          .pipe(output)
          .invoke(inputParam)
          .then((result: z.infer<typeof TopicZodSchema>) => {
            resolve({
              topics: result.topics.map((v) => {
                return {
                  ...v,
                  // implementation of Content
                  type: "topic",
                  id: uuidv4(),
                  connectedMessageIds: [], // topic なので初期 connectedMessageIds は空
                  groupIds: [],
                  agendaIds: [], // topic なので agenda をいれないといけないが、それは View 側で処理する
                  content: v.topic.join("\n\n"),
                  selected: false,
                  position: { x: 0, y: 0 },
                  width: 0,
                };
              }),
            });
          })
          .catch((err) => {
            console.error("_invokeTopic: error", err);
            reject(err);
          });
      } catch (err) {
        console.error("_invokeTopic: error", err);
        reject(err);
      }
    });
  }

  // == Virtual Assistant ==

  private async _invokeAssistant(
    props: TopicInvokeParam & VAMessageConf
  ): Promise<InvokeResult> {
    return new Promise(async (resolve, reject) => {
      //console.log("invokeAssistant", props);
      const {
        inputPrompt,
        systemPrompt,
        zodSchema,
        field,
        connectedMessageIds,
      } = props;

      // prompt
      const promptTemplate: (
        | ChatPromptTemplate<any, string>
        | BaseMessagePromptTemplateLike
      )[] = [];
      if (systemPrompt || zodSchema) {
        promptTemplate.push([
          "system",
          `${systemPrompt ?? ""}${
            zodSchema ? "\n{format_instructions}\n" : ""
          }`,
        ]);
      }
      //promptTemplate.push(new MessagesPlaceholder("history"));
      promptTemplate.push(["human", "{input}"]);
      let prompt = ChatPromptTemplate.fromMessages(promptTemplate);

      // model
      const model = this.__constructModel(props);

      // output
      let jsonOutput: StructuredOutputParser<z.ZodTypeAny> | undefined =
        undefined;
      if (zodSchema) {
        jsonOutput = StructuredOutputParser.fromZodSchema(zodSchema);
      }

      // invoke
      const runnable = jsonOutput
        ? prompt.pipe(model).pipe(jsonOutput)
        : prompt.pipe(model);

      const inputParam = jsonOutput
        ? {
            input: inputPrompt,
            format_instructions: jsonOutput.getFormatInstructions(),
          }
        : { input: inputPrompt };

      runnable
        .invoke(inputParam)
        .then((result) => {
          let value = result;
          if (isBaseMessage(result)) {
            value = result.content;
          } else if ((field && field.type === "MindMap") || zodSchema) {
            value = JSON.stringify(result);
          }

          // AIMessage を Content
          const resultMessage = getDefaultMessage();
          resultMessage.content = value.toString();
          resultMessage.connectedMessageIds = connectedMessageIds;
          resultMessage.isJSON = !!zodSchema;

          const finalResult: InvokeResult = {
            message: resultMessage,
            startTimestamp: props.startTimestamp,
            assistantName: props.assistantId,
            dataThreadId: props.threadId,
          };
          console.log("invokeAssistant: result", finalResult);
          resolve(finalResult);
        })
        .catch((err) => {
          console.log("invokeAssistant: error", err);
          reject(err);
        });
    });
  }

  private _initialize() {
    // Topic
    this._ipcMain.removeAllListeners(IPCInvokeKeys.GET_TOPIC);
    this._ipcMain.handle(
      IPCInvokeKeys.GET_TOPIC,
      (e, props: TopicInvokeParam) => {
        return this._invokeTopic(props);
      }
    );

    // Virtual Assistant
    this._ipcMain.removeAllListeners(IPCInvokeKeys.LANGCHAIN_ASSISTANT_INVOKE);
    this._ipcMain.handle(
      IPCInvokeKeys.LANGCHAIN_ASSISTANT_INVOKE,
      (
        e,
        param: {
          content: string;
          systemPrompt?: string;
          customField?: Record<string, any>; //Map など JSON化できないもの以外
        },
        startTimestamp: number,
        assistantId: string,
        threadId: string,
        connectedMessageIds: Array<string>,
        modelType?: ModelType,
        jsonType?: "MindMap",
        difyConf?: DifyConf,
        flowiseConf?: FlowiseConf,
        langGraphConf?: LangGraphConf,
        structuredOutputSchema?: string,
        attachHistoryLimit?: number,
        reactComponent?: string
      ) => {
        let schema: z.ZodTypeAny | undefined;
        if (jsonType === "MindMap") {
          schema = MindMapSchema;
        } else if (structuredOutputSchema) {
          const zodSchema = new Function(
            "z",
            `return ${structuredOutputSchema}`
          );
          schema = zodSchema(z);
        }
        return this._invokeAssistant({
          inputPrompt: param.content,
          systemPrompt: param.systemPrompt,
          field: param.customField,
          temperature: 0,
          startTimestamp,
          assistantId,
          threadId,
          connectedMessageIds,
          modelType,
          difyConf,
          flowiseConf,
          langGraphConf,
          zodSchema: schema,
          attachHistoryLimit,
          reactComponent,
        });
      }
    );
  }
}
