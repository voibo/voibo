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
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { Agenda } from "../../../renderer/views/store/useAgendaStore.jsx";
import { LangGraphInvokeParams } from "../agentLangGraph.js";
import {
  getTargetCategoryDetail,
  getTargetClassificationDetail,
} from "../agentManagerDefinition.js";
import { VABaseGraph, VAGraphOutput } from "../VABaseGraph.js";
import { DuckDuckGoSearch } from "./tool/duckduckgoSearch.js";

export class AgendaSummarizerGraph extends VABaseGraph {
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
        systemPrompt: `You have a transcript of a conversation about the following agenda.
First, determine what should be summarized by considering the agenda, as well as the agenda's classification and content categories, and then summarize the text based on the summary items.
Note that take into account the possibility of phonetic misinterpretations and homonyms.
Also you can use search engines to find important information.
Whenever you use search results, you must state the page and URL you searched for.
Always respond in Japanese.

### Agenda
${input.agendaContext}

### Classifications
${input.agendas
            ?.map(
              (agenda: Agenda) =>
                `* ${agenda.classification}:${getTargetClassificationDetail(
                  agenda.classification
                )}`
            )
            .join("\n")}

### Content Categories
${input.agendas
            ?.map(
              (agenda: Agenda) =>
                `* ${agenda.category}:${getTargetCategoryDetail(agenda.category)}`
            )
            .join("\n")}
`,
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
