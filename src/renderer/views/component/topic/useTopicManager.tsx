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
import { useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { IPCInvokeKeys } from "../../../../common/constants.js";
import { isLLMAnalyzedTopics } from "../../../../common/content/topic.js";
import {
  EnglishTopicPrompt,
  TopicInvokeParam,
} from "../../../../common/content/assisatant.js";
import { useMinutesAgendaStore } from "../../store/useAgendaStore.jsx";
import { useTopicStore } from "../../store/useMinutesStore.jsx";
import { useVBStore } from "../../store/useVBStore.jsx";
import { useMinutesStore } from "../../store/useMinutesStore.jsx";
import { processTopicAction } from "../../action/TopicAction.js";

export function useTopicManager(): void {
  const startTimestamp = useVBStore((state) => state.startTimestamp);
  const topicAIConf = useMinutesStore(startTimestamp)(
    (state) => state.topicAIConf
  );
  const topicState = useTopicStore((state) => state);
  const getAgenda = useMinutesAgendaStore(startTimestamp)(
    (state) => state.getAgenda
  );

  // process stocked prompts
  useEffect(() => {
    const targetIndex = topicState.topicPrompts.findIndex(
      (v) => !v.isRequested
    );
    if (!topicState.topicProcessing && targetIndex > -1) {
      const handleRequest = async () => {
        topicState.startTopicProcess();

        // make a request
        const currentTopic = topicState.topicPrompts[targetIndex];
        let lastResult = "";
        if (topicState.topicRes && topicState.topicRes.data.topics.length > 0) {
          const lastTopic =
            topicState.topicRes.data.topics[
              topicState.topicRes.data.topics.length - 1
            ];
          lastResult = `${lastTopic.title}\n\n ${
            Array.isArray(lastTopic.topic)
              ? lastTopic.topic.join("\n")
              : lastTopic.topic
          }`;

          if (lastTopic.seedData && lastTopic.seedData.agendaIdList) {
            lastTopic.seedData.agendaIdList.forEach((agendaId) => {
              const relatedAgenda = getAgenda(agendaId);
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
            const relatedAgenda = getAgenda(agendaId);
            console.log(
              "useTopicManager: currentTopic agendaIdList",
              relatedAgenda
            );
          });
        }

        const prompt = `"""Immediate Previous Content\n${lastResult}\n"""\n\n"""Content\n${currentTopic.text}\n"""\n`;
        const updatePrompts = [...topicState.topicPrompts];
        updatePrompts[targetIndex].isRequested = true;
        await window.electron
          .invoke(IPCInvokeKeys.GET_TOPIC, {
            systemPrompt: EnglishTopicPrompt, //,vbState.topicAIConf.systemPrompt,
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
              const responsePrompt = topicState.topicPrompts[targetIndex];
              topicState.topicSeeds.forEach((seed) => {
                if (seed == responsePrompt.seedData) {
                  seed.requireUpdate = false;
                }
              });
              topicState.resTopicSuccess({
                res: {
                  data: resJSON,
                },
                prompts: updatePrompts,
                topicSeed: topicState.topicSeeds,
              });
            } else {
              console.error("resError: Invalid JSON data", resJSON);
              const responsePrompt = topicState.topicPrompts[targetIndex];
              topicState.topicSeeds.forEach((seed) => {
                if (seed == responsePrompt.seedData) {
                  seed.requireUpdate = false;
                }
              });
              topicState.resTopicError({
                error: new Error("Invalid JSON data"),
                prompts: updatePrompts,
                topicSeed: topicState.topicSeeds,
              });
            }
          })
          .catch((e) => {
            console.error("resError :general error", e);
            const responsePrompt = topicState.topicPrompts[targetIndex];
            topicState.topicSeeds.forEach((seed) => {
              if (seed == responsePrompt.seedData) {
                seed.requireUpdate = false;
              }
            });
            topicState.resTopicError({
              error: e,
              prompts: updatePrompts,
              topicSeed: topicState.topicSeeds,
            });
          });
      };

      handleRequest();
    }
  }, [
    topicState.topicProcessing,
    topicState.topicPrompts,
    topicState.topicRes,
  ]);

  useEffect(() => {
    if (topicState.topicRes) {
      console.log("useTopicManager: setTopic", topicState.topicRes.data.topics);
      processTopicAction({
        type: "setTopic",
        payload: {
          topics: topicState.topicRes.data.topics,
        },
      });
    }
  }, [topicState.topicRes]);
}
