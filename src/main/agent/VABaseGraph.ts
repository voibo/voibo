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
import { ChatAnthropic } from "@langchain/anthropic";
import { BaseMessage } from "@langchain/core/messages";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { Runnable } from "@langchain/core/runnables";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI, ChatOpenAICallOptions } from "@langchain/openai";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { LangGraphInvokeParams } from "./agentLangGraph.js";
import { ModelType } from "../../common/content/assisatant.js";
import { VBMainConf } from "../../common/electronStore.js";

export type VAGraphInitParams = { store: VBMainConf };
export type VAGraphOutput = {
  messages: BaseMessage[];
};

export abstract class VABaseGraph {
  protected initParam: VAGraphInitParams;
  constructor(initParam: VAGraphInitParams) {
    this.initParam = initParam;
  }

  public abstract invoke(input: LangGraphInvokeParams): Promise<VAGraphOutput>;

  // == Utility functions ==

  protected constructLLM({
    modelType,
    temperature,
  }: {
    modelType: ModelType | undefined;
    temperature: number | undefined;
  }):
    | ChatAnthropic
    | ChatGoogleGenerativeAI
    | ChatOpenAI<ChatOpenAICallOptions> {
    // model
    let model;
    switch (modelType) {
      case "claude-3-opus":
        model = new ChatAnthropic({
          apiKey: this.initParam.store.ANTHROPIC_API_KEY,
          temperature: temperature ?? 0,
          modelName: "claude-3-opus-20240229",
          maxRetries: 3,
        });
        break;
      case "gpt-4":
        model = new ChatOpenAI({
          apiKey: this.initParam.store.OPENAI_API_KEY,
          temperature: temperature ?? 0,
          modelName: "gpt-4o",
          maxRetries: 3,
        });
        break;
      case "gemini-1.5-pro":
        model = new ChatGoogleGenerativeAI({
          apiKey: this.initParam.store.GOOGLE_API_KEY,
          temperature: temperature ?? 0,
          modelName: "gemini-1.5-pro-latest",
          maxRetries: 3,
        });
        break;
      default:
      case "gemini-1.5-flash":
        model = new ChatGoogleGenerativeAI({
          apiKey: this.initParam.store.GOOGLE_API_KEY,
          temperature: temperature ?? 0,
          modelName: "gemini-1.5-flash-latest",
          maxRetries: 3,
        });
        break;
    }
    return model;
  }

  protected async createAgent({
    llm,
    tools,
    systemPrompt,
  }: {
    llm: ReturnType<typeof VABaseGraph.prototype.constructLLM>;
    tools?: any[];
    systemPrompt: string;
  }): Promise<Runnable> {
    const promptOpt: Array<any> = [
      ["system", systemPrompt],
      new MessagesPlaceholder("messages"),
    ];
    if (tools && tools.length > 0) {
      promptOpt.push(new MessagesPlaceholder("agent_scratchpad"));
    }
    const prompt = await ChatPromptTemplate.fromMessages(promptOpt);
    if (tools && tools.length > 0) {
      const agent = await createToolCallingAgent({ llm, tools, prompt });
      return new AgentExecutor({ agent, tools });
    } else {
      return prompt.pipe(llm);
    }
  }
}
