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
import { TopicSeed } from "../../../common/Topic.js";
import {
  initTopicManagerState,
  TopicManagerAction,
  topicManagerReducer,
  TopicManagerState,
  TopicRequest,
} from "../component/topic/useTopicManager.jsx";
import { useAgendaStore } from "./useAgendaStore.jsx";
import { useVBStore } from "./useVBStore.jsx";
import { useMinutesStore } from "./useMinutesStore.jsx";

// ==== Zustand ====

export type TopicManagerDispatchStore = {
  topicDispatch: (action: TopicManagerAction) => void;
  updateTopicSeeds: (enforceUpdateAll: boolean) => void;
};

export const useTopicStore = create<
  TopicManagerState & TopicManagerDispatchStore
>()((set, get) => ({
  // data
  ...initTopicManagerState,
  // action
  topicDispatch: (action) => {
    set((state) => {
      return topicManagerReducer(state, action);
    });
  },
  updateTopicSeeds: (enforceUpdateAll: boolean) => {
    // 現在の全discussionから、全topicSeedを再構築する
    const topicSeeds: TopicSeed[] = [];
    const minutesStore = useMinutesStore(
      useVBStore.getState().startTimestamp
    ).getState();
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
            ...useAgendaStore
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

    get().topicDispatch({
      type: "replaceTopicSeed",
      payload: {
        topicSeed: updatedTopicSeed,
        prompts: targetTopicSeedRequests,
      },
    });
  },
}));
