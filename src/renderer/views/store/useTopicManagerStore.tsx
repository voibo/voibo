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
import { create } from "zustand";
import {
  LLMAnalyzedTopics,
  TopicRequest,
  TopicSeed,
} from "../../../common/content/topic.js";
import { useMinutesAgendaStore } from "./useAgendaStore.jsx";
import { useVBStore } from "./useVBStore.jsx";
import { useMinutesStore } from "./useMinutesStore.jsx";
import { subscribeWithSelector } from "zustand/middleware";

type TopicManagerState = {
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

type TopicManagerDispatch = {
  updateTopicSeeds: (enforceUpdateAll: boolean) => void;
  startProcess: () => void;
  resError: (props: {
    error: Error;
    prompts: TopicRequest[];
    topicSeed: TopicSeed[];
  }) => void;
  resSuccess: (props: {
    res: { data: LLMAnalyzedTopics };
    prompts: TopicRequest[];
    topicSeed: TopicSeed[];
  }) => void;
};

export const useTopicStore = create<TopicManagerState & TopicManagerDispatch>()(
  subscribeWithSelector((set, get, api) => ({
    // data
    processing: false,
    error: null,
    res: null,
    prompts: [],
    topicSeeds: [],

    // action
    startProcess: () => {
      set({ processing: true });
    },

    updateTopicSeeds: (enforceUpdateAll: boolean) => {
      // 現在の全discussionから、全topicSeedを再構築する
      const topicSeeds: TopicSeed[] = [];
      const startTimestamp = useVBStore.getState().startTimestamp;
      const minutesStore = useMinutesStore(startTimestamp).getState();
      minutesStore.discussion.forEach((segment) => {
        const currentStartTimestamp = Number(segment.timestamp);
        const currentEndTimestamp = segment.texts.reduce(
          (pre, current) => pre + Number(current.length) / 1000,
          currentStartTimestamp
        );
        const text = segment.texts.reduce(
          (inPrev, inCurrent) => inPrev + inCurrent.text,
          ""
        );
        if (segment.topicStartedPoint) {
          topicSeeds.push({
            startTimestamp: currentStartTimestamp,
            endTimestamp: currentEndTimestamp,
            text,
            requireUpdate: enforceUpdateAll,
            agendaIdList: [
              ...useMinutesAgendaStore(startTimestamp)
                .getState()
                .getDiscussedAgendas({
                  startFromMStartMsec: currentStartTimestamp * 1000,
                  endFromMStartMsec: currentEndTimestamp * 1000,
                })
                .map((agenda) => agenda.id),
            ],
          });
          //console.log("updateTopicSeeds: topicStartedPoint", topicSeeds);
        } else if (topicSeeds.length > 0) {
          topicSeeds[topicSeeds.length - 1].endTimestamp = currentEndTimestamp;
          topicSeeds[topicSeeds.length - 1].text += "\n" + text;
        }
      });

      // 現在のtopicSeedsと比較して、変更があれば更新対象にする
      let updatedTopicSeed: TopicSeed[] = [];
      if (enforceUpdateAll) {
        updatedTopicSeed = topicSeeds;
      } else {
        topicSeeds.forEach((seed) => {
          const currentSeed = useTopicStore
            .getState()
            .topicSeeds.find(
              (currentSeed) =>
                currentSeed.startTimestamp == seed.startTimestamp &&
                currentSeed.endTimestamp == seed.endTimestamp &&
                currentSeed.text == seed.text
            );
          if (!currentSeed) {
            updatedTopicSeed.push({ ...seed, requireUpdate: true });
          } else {
            updatedTopicSeed.push(seed);
          }
        });
      }

      // 更新対象の topicSeed を TopicRequest に変換
      const targetTopicSeedRequests: TopicRequest[] = updatedTopicSeed
        .filter((seed) => seed.requireUpdate)
        .map((seed) => {
          return {
            text: seed.text,
            seedData: seed,
            isRequested: false,
          };
        });

      set({
        prompts: targetTopicSeedRequests,
        topicSeeds: updatedTopicSeed,
      });
    },

    resSuccess: ({ res, prompts, topicSeed }) => {
      set({
        processing: false,
        error: null,
        res: res,
        prompts: prompts,
        //topicSeeds: topicSeed,
      });
    },

    resError: ({ error, prompts, topicSeed }) => {
      set({
        processing: false,
        error: error,
        res: null,
        prompts: prompts,
        //topicSeeds: topicSeed,
      });
    },
  }))
);
