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
import { Dispatch, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { IPCInvokeKeys } from "../../../common/constants.js";
import {
  EnglishTopicPrompt,
  TopicInvokeParam,
} from "../../../common/agentManagerDefinition.js";
import { useAgendaStore } from "../store/useAgendaStore.jsx";
import { useTopicStore } from "../store/useTopicManagerStore.jsx";
import { useVBStore } from "../store/useVBStore.jsx";
import { isTopic, Topic, TopicSeed } from "./Topic.js";
import { useMinutesStore } from "../store/useMinutesStore.jsx";

export type LLMAnalyzedTopics = {
  topics: Topic[];
};

export function isLLMAnalyzedTopics(obj: any): obj is LLMAnalyzedTopics {
  return obj && Array.isArray(obj.topics) && obj.topics.every(isTopic);
}

export type TopicRequest = {
  text: string;
  seedData: TopicSeed;
  isRequested: boolean;
};

export type TopicManagerState = {
  //  res: state
  processing: boolean;
  error: Error | null;
  res: {
    data: LLMAnalyzedTopics;
  } | null;

  // request
  prompts: TopicRequest[];

  // seed
  topicSeeds: TopicSeed[];
};

export const initTopicManagerState: TopicManagerState = {
  processing: false,
  error: null,
  res: null,
  prompts: [],
  topicSeeds: [],
};

export type TopicManagerAction =
  | {
      type: "startProcess";
    }
  | {
      type: "resError";
      payload: {
        error: Error;
        prompts: TopicRequest[];
        topicSeed: TopicSeed[];
      };
    }
  | {
      type: "resSuccess";
      payload: {
        res: {
          data: LLMAnalyzedTopics;
        };
        prompts: TopicRequest[];
        topicSeed: TopicSeed[];
      };
    }
  | {
      type: "replaceTopicSeed";
      payload: {
        prompts: TopicRequest[];
        topicSeed: TopicSeed[];
      };
    };

export const topicManagerReducer = (
  state: TopicManagerState,
  action: TopicManagerAction
): TopicManagerState => {
  switch (action.type) {
    case "startProcess":
      return {
        ...state,
        processing: true,
      };
    case "resError":
      return {
        ...state,
        processing: false,
        error: action.payload.error,
        res: null,
        prompts: action.payload.prompts,
      };
    case "resSuccess":
      //console.log("useOpenAIChat: resSuccess", action);
      return {
        ...state,
        processing: false,
        error: null,
        res: action.payload.res,
        prompts: action.payload.prompts,
      };
    case "replaceTopicSeed":
      //console.log("useOpenAIChat: replaceTopicSeed", action);
      return {
        ...state,
        topicSeeds: action.payload.topicSeed,
        prompts: action.payload.prompts,
      };
    default:
      console.log("useOpenAIChat: default", action);
      return state;
  }
};

export function useTopicManager(): {
  state: TopicManagerState;
  dispatcher: Dispatch<TopicManagerAction>;
} {
  // openAIChat
  const minutesStore = useMinutesStore(
    useVBStore.getState().startTimestamp
  ).getState();
  const topicAIConf = minutesStore.topicAIConf;
  const vfDispatch = useVBStore((state) => state.vfDispatch);
  const topicState = useTopicStore((state) => state);
  const topicDispatcher = useTopicStore((state) => state.topicDispatch);
  const agendaStore = useAgendaStore((state) => state);

  // process stocked prompts
  useEffect(() => {
    const targetIndex = topicState.prompts.findIndex((v) => !v.isRequested);
    if (!topicState.processing && targetIndex > -1) {
      const handleRequest = async () => {
        //console.log("useOpenAIChat: handleRequest startProcess");
        topicDispatcher({
          type: "startProcess",
        });
        // make a request
        const currentTopic = topicState.prompts[targetIndex];
        let lastResult = "";
        if (topicState.res && topicState.res.data.topics.length > 0) {
          const lastTopic =
            topicState.res.data.topics[topicState.res.data.topics.length - 1];
          lastResult = `${lastTopic.title}\n\n ${
            Array.isArray(lastTopic.topic)
              ? lastTopic.topic.join("\n")
              : lastTopic.topic
          }`;

          if (lastTopic.seedData && lastTopic.seedData.agendaIdList) {
            lastTopic.seedData.agendaIdList.forEach((agendaId) => {
              const relatedAgenda = agendaStore.getAgenda(agendaId);
              console.log(
                "useTopicManager: lastTopic agendaIdList",
                relatedAgenda
              );
            });
          }
        }

        // agenda
        if (currentTopic.seedData.agendaIdList) {
          currentTopic.seedData.agendaIdList.forEach((agendaId) => {
            const relatedAgenda = agendaStore.getAgenda(agendaId);
            console.log(
              "useTopicManager: currentTopic agendaIdList",
              relatedAgenda
            );
          });
        }

        const prompt = `"""Immediate Previous Content\n${lastResult}\n"""\n\n"""Content\n${currentTopic.text}\n"""\n`;
        const updatePrompts = [...topicState.prompts];
        updatePrompts[targetIndex].isRequested = true;
        await window.electron
          .invoke(IPCInvokeKeys.GET_TOPIC, {
            systemPrompt: EnglishTopicPrompt, //,vfState.topicAIConf.systemPrompt,
            structuredOutputSchema: topicAIConf.structuredOutputSchema,
            inputPrompt: prompt,
            modelType: topicAIConf.modelType,
            temperature: topicAIConf.temperature,
            difyConf: topicAIConf.difyConf,
            flowiseConf: topicAIConf.flowiseConf,
          } as TopicInvokeParam)
          .then((resJSON) => {
            console.log("useTopicManager: getTopic", resJSON);
            if (isLLMAnalyzedTopics(resJSON)) {
              resJSON.topics.forEach((topic) => {
                topic.id = uuidv4();
                topic.seedData = currentTopic.seedData;
                topic.agendaIds = currentTopic.seedData.agendaIdList ?? [];
              });
              const responsePrompt = topicState.prompts[targetIndex];
              topicState.topicSeeds.forEach((seed) => {
                if (seed == responsePrompt.seedData) {
                  seed.requireUpdate = false;
                }
              });
              console.log(
                "useOpenAIChat: resSuccess",
                resJSON,
                topicState.topicSeeds
              );
              topicDispatcher({
                type: "resSuccess",
                payload: {
                  res: {
                    data: resJSON,
                  },
                  prompts: updatePrompts,
                  topicSeed: topicState.topicSeeds,
                },
              });
            } else {
              console.error("resError: Invalid JSON data", resJSON);
              const responsePrompt = topicState.prompts[targetIndex];
              topicState.topicSeeds.forEach((seed) => {
                if (seed == responsePrompt.seedData) {
                  seed.requireUpdate = false;
                }
              });
              topicDispatcher({
                type: "resError",
                payload: {
                  error: new Error("Invalid JSON data"),
                  prompts: updatePrompts,
                  topicSeed: topicState.topicSeeds,
                },
              });
            }
          })
          .catch((e) => {
            console.error("resError :general error", e);
            const responsePrompt = topicState.prompts[targetIndex];
            topicState.topicSeeds.forEach((seed) => {
              if (seed == responsePrompt.seedData) {
                seed.requireUpdate = false;
              }
            });
            topicDispatcher({
              type: "resError",
              payload: {
                error: e,
                prompts: updatePrompts,
                topicSeed: topicState.topicSeeds,
              },
            });
          });
      };

      handleRequest();
    }
  }, [topicState.processing, topicState.prompts, topicState.res]);

  // update vfState
  useEffect(() => {
    if (topicState.res) {
      console.log("useOpenAIChat: update vfState", topicState.res.data.topics);
      vfDispatch({
        type: "setTopic",
        payload: {
          topics: topicState.res.data.topics,
        },
      });
    }
  }, [topicState.res]);

  return { state: topicState, dispatcher: topicDispatcher };
}
