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
import { net } from "electron";
import { isLangChainHumanMessage } from "./agentManagerDefinition.js";

export interface AgentDifyInput extends BaseChatModelParams {
  url: string;
  apiKey: string;
}

export class AgentDify extends BaseChatModel<
  BaseChatModelCallOptions,
  AIMessageChunk
> {
  clientParams: AgentDifyInput;

  static lc_name() {
    return "AgentDify";
  }

  _llmType() {
    return "dify";
  }

  get lc_secrets(): { [key: string]: string } | undefined {
    return {
      apiKey: "DIFY_API_KEY",
    };
  }

  lc_serializable = true;

  constructor(fields: AgentDifyInput) {
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
        //console.log("AgentDify: _generate: messages", messages);
        if (
          messages.length == 0 ||
          (messages.length > 0 && !isLangChainHumanMessage(messages.at(-1)))
        ) {
          reject(new Error("No human messages to generate"));
        }

        // NOTE:
        // Dify node.js client can NOT work in electron because it require Axios.
        // So, we use electron net module to send request to Dify API.
        const req = net.request({
          method: "POST",
          url: this.clientParams.url,
          headers: {
            Authorization: `Bearer ${this.clientParams.apiKey}`,
            "Content-Type": "application/json",
          },
        });

        req.on("response", (response) => {
          response.on("data", (chunk) => {
            const res = JSON.parse(chunk.toString());
            //console.log(`AgentDify: BODY`, res);
            if (res.data.status === "succeeded" && res.data.outputs.text) {
              resolve({
                generations: [
                  {
                    text: res.data.outputs.text,
                    message: new AIMessage(res.data.outputs.text),
                  },
                ],
                llmOutput: {},
              });
            }
          });
        });

        req.on("error", (error) => {
          reject(error);
        });

        // NOTE:
        // This request body structure is required for Dify workflows API
        req.write(
          JSON.stringify({
            inputs: { query: messages.at(-1)?.content },
            response_mode: "blocking",
            user: `virtual assistant`,
          })
        );
        req.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}
