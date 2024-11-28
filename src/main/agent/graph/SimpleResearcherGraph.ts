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
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { LangGraphInvokeParams } from "../agentLangGraph.js";
import { VABaseGraph, VAGraphOutput } from "../VABaseGraph.js";
import { DuckDuckGoSearch } from "./tool/duckduckgoSearch.js";

export class SimpleResearcherGraph extends VABaseGraph {
  public invoke(input: LangGraphInvokeParams): Promise<VAGraphOutput> {
    return new Promise(async (resolve, reject) => {
      const llmGPT4o = this.constructLLM({
        modelType: "gpt-4",
        temperature: 0.2,
      });

      const researcherAgent = await this.createAgent({
        llm: llmGPT4o,
        tools: [
          new DuckDuckGoSearch({
            searchOptions: {
              locale: "ja-JP",
            },
          }),
        ],
        systemPrompt: `You are an excellent researcher.
Research and report on the key points contained in the following context.
You must use search engines for your research, but you must include the site name and URL when using search results.
Always respond in Japanese.`,
      });

      const invokeResult = await researcherAgent.invoke({
        messages: [
          new HumanMessage({
            content: input.context!,
          }),
        ],
      });

      if (invokeResult && invokeResult.output && invokeResult.messages) {
        resolve({
          messages: [
            ...invokeResult.messages,
            new AIMessage(invokeResult.output),
          ],
        });
      } else {
        reject(new Error("No results"));
      }
    });
  }
}
