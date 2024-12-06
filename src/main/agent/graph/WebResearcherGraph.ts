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
import { LangGraphInvokeParams } from "../agentLangGraph.js";
import { VABaseGraph, VAGraphOutput } from "../VABaseGraph.js";

import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { RunnableConfig } from "@langchain/core/runnables";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";

import { JsonOutputToolsParser } from "langchain/output_parsers";
import { z } from "zod";
import { DuckDuckGoSearch } from "./tool/duckduckgoSearch.js";

const WebResearcherGraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  // The agent node that last performed work
  next: Annotation<string>({
    reducer: (x, y) => y ?? x ?? END,
    default: () => END,
  }),
});

export class WebResearcherGraph extends VABaseGraph {
  public invoke(input: LangGraphInvokeParams): Promise<VAGraphOutput> {
    return new Promise(async (resolve, reject) => {
      const llmGPT4o = this.constructLLM({
        modelType: "gpt-4",
        temperature: 0.2,
      });

      const members = ["researcher", "writer"];
      const options = [END, ...members] as const;

      const formattedPrompt = await ChatPromptTemplate.fromMessages([
        [
          "system",
          `You are a supervisor tasked with managing a conversation between the following workers: {members}.
    Given the following user request, respond with the worker to act next.
    Each worker will perform a task and respond with their results and status.
    When finished, respond with FINISH.`,
        ],
        new MessagesPlaceholder("messages"),
        [
          "user",
          `Given the conversation above, who should act next? 
    Or should we FINISH?
    Select one of: {options}`,
        ],
      ]).partial({
        options: options.join(", "),
        members: members.join(", "),
      });

      const supervisorChain = formattedPrompt
        .pipe(
          llmGPT4o.bind({
            tools: [
              new DynamicStructuredTool({
                name: "route",
                description: "Select the next role.",
                schema: z.object({
                  route: z.enum(options).describe("Select the next role."),
                }),
                func: async (x) => {
                  return x.route;
                },
              }),
            ],
          })
        )
        .pipe(new JsonOutputToolsParser())
        // select the first one
        .pipe((x) => {
          return { next: x[0].args.route };
        });

      const supervisorNode = async (
        state: typeof WebResearcherGraphState.State,
        config?: RunnableConfig
      ): Promise<Partial<typeof WebResearcherGraphState.State>> => {
        const result = await supervisorChain.invoke(state, config);
        if (result.next === END) {
          return { next: END, messages: state.messages };
        } else {
          return result;
        }
      };

      const researcherAgent = await this.createAgent({
        llm: llmGPT4o,
        tools: [
          new DuckDuckGoSearch({
            searchOptions: {
              locale: "ja-JP",
            },
          }),
        ],
        systemPrompt: `You are a Web researcher.
        You can use search engines to find important information.
        Whenever you use search results, you must state the page and URL you searched for.`,
      });

      const researcherNode = async (
        state: typeof WebResearcherGraphState.State,
        config?: RunnableConfig
      ): Promise<Partial<typeof WebResearcherGraphState.State>> => {
        const result = await researcherAgent.invoke(state, config);
        return {
          messages: [
            new HumanMessage({ content: result.output, name: "Researcher" }),
          ],
        };
      };

      const writerAgent = await this.createAgent({
        llm: llmGPT4o,
        systemPrompt: `You are a good business writer. 
        Write a good document about this with Japanese.
        Whenever you use search results, you must state the page and URL you searched for.`,
      });

      const writerNode = async (
        state: typeof WebResearcherGraphState.State,
        config?: RunnableConfig
      ): Promise<Partial<typeof WebResearcherGraphState.State>> => {
        const result = await writerAgent.invoke(state, config);
        return {
          messages: [
            new HumanMessage({ content: result.content, name: "Writer" }),
          ],
        };
      };

      const workflow = new StateGraph(WebResearcherGraphState)
        .addNode("writer", writerNode)
        .addNode("researcher", researcherNode)
        .addNode("supervisor", supervisorNode)
        .addEdge("writer", "supervisor")
        .addEdge("researcher", "supervisor")
        .addConditionalEdges(
          "supervisor",
          (x: typeof WebResearcherGraphState.State) => x.next
        )
        .addEdge(START, "supervisor");
      const graph = workflow.compile();

      // == Start ==
      if (!input.context) {
        reject(new Error("No parameters to research"));
      }

      const streamResults = graph.stream(
        {
          messages: [
            new HumanMessage({
              content: input.context!,
            }),
          ],
        },
        { recursionLimit: 150 }
      );
      let invokeResult;
      for await (const result of await streamResults) {
        //console.log("MinuteTakerGraph: invoke: stream: interim ", result);
        if (result.supervisor && result.supervisor.next === END) {
          invokeResult = result.supervisor.messages;
          break;
        }
      }
      //console.log("stream: end", invokeResult);
      if (invokeResult && invokeResult.length > 0) {
        resolve({
          messages: invokeResult,
        });
      } else {
        reject(new Error("No results"));
      }
    });
  }
}
