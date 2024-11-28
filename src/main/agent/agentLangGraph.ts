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
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import {
  BaseChatModel,
  BaseChatModelCallOptions,
  type BaseChatModelParams,
} from "@langchain/core/language_models/chat_models";
import {
  AIMessage,
  AIMessageChunk,
  BaseMessage,
} from "@langchain/core/messages";
import { ChatResult } from "@langchain/core/outputs";
import Store from "electron-store";
import { AgendaSummarizerGraph } from "./graph/AgendaSummarizerGraph.js";
import { SimpleResearcherGraph } from "./graph/SimpleResearcherGraph.js";

export type LangGraphInvokeParams = {
  context: string | undefined;
  agendaContext: string | undefined;
  agendas: Record<string, any> | undefined;
};

export interface AgentLangGraphInput extends BaseChatModelParams {
  // unique params for VA
  store: Store<StoreType>; // Client 側で LLM の設定情報を取得するための store。 Server で動作する場合は、別の方法で設定情報を取得する
  langGraphID: string; // 呼び出すLangGraph Assistant の呼び分けのためのID
  invokeParams: LangGraphInvokeParams; // invoke 時に渡すパラメータ。 LangGraphの場合、通常のpromptを利用しないので、invokeParams だけで良い
}

export class AgentLangGraph extends BaseChatModel<
  BaseChatModelCallOptions,
  AIMessageChunk
> {
  clientParams: AgentLangGraphInput;

  static lc_name() {
    return "AgentLangGraph";
  }

  _llmType() {
    return "langgraph";
  }

  lc_serializable = true;

  constructor(fields: AgentLangGraphInput) {
    super(fields);
    this.clientParams = fields;
  }

  override async _generate(
    messages: BaseMessage[],
    options: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun
  ): Promise<ChatResult> {
    return new Promise((resolve, reject) => {
      try {
        if (!this.clientParams.invokeParams.context) {
          reject(new Error("No parameters to generate"));
        }

        console.log(
          "AgentLangGraph: _generate: langGraphID:",
          this.clientParams.langGraphID
        );
        let agent;
        switch (this.clientParams.langGraphID) {
          case "agenda_summarizer":
            agent = new AgendaSummarizerGraph({
              store: this.clientParams.store,
            });
            break;
          case "simple_researcher":
          default:
            agent = new SimpleResearcherGraph({
              store: this.clientParams.store,
            });
        }

        agent
          .invoke({
            context: this.clientParams.invokeParams.context,
            agendaContext: this.clientParams.invokeParams.agendaContext,
            agendas: this.clientParams.invokeParams.agendas,
          })
          .then((output) => {
            console.log("AgentLangGraph: _generate: output", output);
            const message = output.messages.at(-1);
            if (!message) {
              reject("No message included in the output");
            } else {
              const text = Array.isArray(message.content)
                ? message.content.join(" ")
                : message.content;
              resolve({
                generations: [
                  {
                    text: text,
                    message: new AIMessage(text),
                  },
                ],
                llmOutput: {},
              });
            }
          })
          .catch((error) => {
            console.error(`AgentLangGraph: Error`, error);
            reject(error);
          });

        /*
        // access to the LangGraph API Server
        const req = net.request({
          method: "POST",
          url: "http://localhost:8080/assistant",
          headers: {
            "Content-Type": "application/json",
          },
        });

        req.on("response", (response) => {
          response.on("data", (chunk) => {
            try {
              //console.log(`AgentLangGraph: BODY`, chunk.toString());
              const res = JSON.parse(chunk.toString());
              //console.log(`AgentLangGraph: BODY JSON`, res);
              if (res.status === "succeeded" && res.outputs.text) {
                resolve({
                  generations: [
                    {
                      text: res.outputs.text,
                      message: new AIMessage(res.outputs.text),
                    },
                  ],
                  llmOutput: {},
                });
              }
            } catch (error) {
              console.error(`AgentLangGraph: Error`, error);
              reject(error);
            }
          });
        });

        req.on("error", (error) => {
          reject(error);
        });
        req.write(JSON.stringify({ query: messages.at(-1)?.content }));
        req.end();
        */
      } catch (error) {
        console.error(`AgentLangGraph: Error`, error);
        reject(error);
      }
    });
  }
}
