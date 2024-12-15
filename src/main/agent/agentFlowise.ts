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
import { isLangChainHumanMessage } from "../../common/content/assisatant.js";

export interface AgentFlowiseInput extends BaseChatModelParams {
  apiKey: string;
  chatFlowID: string;
}

export class AgentFlowise extends BaseChatModel<
  BaseChatModelCallOptions,
  AIMessageChunk
> {
  clientParams: AgentFlowiseInput;

  static lc_name() {
    return "AgentFlowise";
  }

  _llmType() {
    return "flowise";
  }

  get lc_secrets(): { [key: string]: string } | undefined {
    return {
      apiKey: "FLOWISE_API_KEY",
    };
  }

  lc_serializable = true;

  constructor(fields: AgentFlowiseInput) {
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
        console.log("AgentFlowise: _generate: clientParams", this.clientParams);
        if (
          messages.length == 0 ||
          (messages.length > 0 && !isLangChainHumanMessage(messages.at(-1)))
        ) {
          reject(new Error("No human messages to generate"));
        }

        const req = net.request({
          method: "POST",
          url: this.clientParams.chatFlowID,
          headers: {
            Authorization: `Bearer ${this.clientParams.apiKey}`,
            "Content-Type": "application/json",
          },
        });

        req.on("response", (response) => {
          response.on("data", (chunk) => {
            try {
              const res = JSON.parse(chunk.toString());
              if (res.text) {
                resolve({
                  generations: [
                    {
                      text: res.text,
                      message: new AIMessage(res.text),
                    },
                  ],
                  llmOutput: {},
                });
              } else if (res.json) {
                const json = JSON.stringify(res.json);
                resolve({
                  generations: [
                    {
                      text: json,
                      message: new AIMessage(json),
                    },
                  ],
                  llmOutput: {},
                });
              } else {
                console.log(
                  `AgentDify: There is no text or json in the response.`,
                  res
                );
              }
            } catch (error) {
              console.error(
                `AgentFlowise: Unexpected error on requesting`,
                error
              );
              reject(error);
            }
          });
        });

        req.on("error", (error) => {
          console.error(`AgentFlowise: Error on requesting`, error);
          reject(error);
        });
        req.write(
          JSON.stringify({
            question: messages.at(-1)?.content,
          })
        );
        req.end();
      } catch (error) {
        console.error(`AgentFlowise: Error`, error);
        reject(error);
      }
    });
  }
}
