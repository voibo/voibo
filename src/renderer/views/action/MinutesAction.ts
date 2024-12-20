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
import { IPCSenderKeys } from "../../../common/constants.js";
import { useMinutesAgendaStore } from "../store/useAgendaStore.jsx";
import { useMinutesAssistantStore } from "../store/useAssistantsStore.jsx";
import { useMinutesContentStore } from "../store/useContentStore.jsx";
import { useMinutesGroupStore } from "../store/useGroupStore.jsx";
import { useMinutesStore } from "../store/useMinutesStore.jsx";
import { useMinutesTitleStore } from "../store/useMinutesTitleStore.jsx";
import {
  prepareAssistantNodeTo,
  prepareContentsNodeTo,
  useVBReactflowStore,
} from "../store/useVBReactflowStore.jsx";
import {
  NO_MINUTES_START_TIMESTAMP,
  useVBStore,
} from "../store/useVBStore.jsx";
import { ActionBase } from "./ActionBase.js";
import { processTopicAction } from "./TopicAction.js";

export type MinutesAction =
  | ActionBase<"createNewMinutes">
  | ActionBase<"deleteMinutes", { startTimestamp: number }>
  | ActionBase<"openMinutes", { startTimestamp: number }>
  | ActionBase<"openHomeMenu">;

export const processMinutesAction = async (action: MinutesAction) => {
  let startTimestamp = NO_MINUTES_START_TIMESTAMP;

  switch (action.type) {
    case "createNewMinutes":
      startTimestamp = Date.now();
      // title
      useMinutesTitleStore.getState().setDefaultMinutesTitle(startTimestamp);

      // main
      window.electron.send(IPCSenderKeys.CREATE_MINUTES, startTimestamp);

      // renderer
      useVBStore.setState({ startTimestamp });
      useMinutesStore(startTimestamp).getState().createNewMinutes();

      await prepareStoresTo(startTimestamp);
      renderStage();
      break;
    case "openMinutes":
      startTimestamp = action.payload.startTimestamp;

      await prepareStoresTo(startTimestamp);
      renderStage();
      break;
    case "openHomeMenu":
      openHomeMenu();
      break;
    case "deleteMinutes":
      console.log("useVBStore: deleteMinutes: 0");
      // delete minutes
      const minutesState = useMinutesStore(startTimestamp).getState();
      minutesState.deleteMinutes();
      useMinutesTitleStore
        .getState()
        .removeMinutesTitle(useVBStore.getState().startTimestamp);

      // open home
      openHomeMenu();
      break;
    default:
      console.warn("processTopicAction: unexpected default", action);
  }
};

const renderStage = () => {
  useVBStore.setState({
    mainMenuOpen: false,
    recording: false,
    interimSegment: null,
  });
};

const renderHome = () => {
  useVBStore.setState({
    recording: false,
    mainMenuOpen: true,
    interimSegment: null,
  });
};

const openHomeMenu = async () => {
  await prepareStoresTo(NO_MINUTES_START_TIMESTAMP);
  // reactflow
  useVBReactflowStore.getState().relocateTopics();
  renderHome();
};

/**
 * Switch stores to the specified minutes. Must be called with await.
 */
const prepareStoresTo = async (startTimestamp: number) => {
  // == Hydrate stores ==
  useVBStore.setState({ startTimestamp });

  console.log(
    "prepareStoresTo: 0",
    startTimestamp,
    useVBStore.getState().allReady
  );
  await Promise.all([
    useMinutesStore(startTimestamp).getState().waitForHydration(),
    useMinutesAgendaStore(startTimestamp).getState().waitForHydration(),
    useMinutesAssistantStore(startTimestamp).getState().waitForHydration(),
    useMinutesContentStore(startTimestamp).getState().waitForHydration(),
    useMinutesGroupStore(startTimestamp).getState().waitForHydration(),
  ]);
  console.log(
    "prepareStoresTo: 1",
    startTimestamp,
    useVBStore.getState().allReady
  );

  // == Subscribe stores ==
  subscribeAssistantInvokeQueue(startTimestamp);

  // == Subscribe to reactflow ==
  useVBReactflowStore.getState().relocateTopics();
  prepareContentsNodeTo(startTimestamp);
  prepareAssistantNodeTo(startTimestamp);
};

// Subscribe to Assistant stores
let unsubscribeAssistantInvokeQueue: (() => void) | null = null;
const subscribeAssistantInvokeQueue = (startTimestamp: number) => {
  const assistantsStore = useMinutesAssistantStore(startTimestamp);
  if (unsubscribeAssistantInvokeQueue) unsubscribeAssistantInvokeQueue();
  unsubscribeAssistantInvokeQueue = assistantsStore.subscribe(
    (assistantState) => assistantState.assistantsMap,
    (state) => {
      Array.from(state.values())
        .filter(
          (assistant) =>
            assistant.invokeQueue.length > 0 && !assistant.onProcess
        )
        .forEach(
          (assistant) =>
            assistantsStore.getState().processInvokeSync(assistant.vaConfig) // sync function to process request => response
        );
    },
    {
      equalityFn: (prev, next) =>
        !Array.from(next.values()).some(
          (nextAssistant) => nextAssistant.invokeQueue.length > 0
        ),
    }
  );
};

/*
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
    const targetIndex = topicState.prompts.findIndex((v) => !v.isRequested);
    if (!topicState.processing && targetIndex > -1) {
      const handleRequest = async () => {
        topicState.startProcess();

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
        const updatePrompts = [...topicState.prompts];
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
              const responsePrompt = topicState.prompts[targetIndex];
              topicState.topicSeeds.forEach((seed) => {
                if (seed == responsePrompt.seedData) {
                  seed.requireUpdate = false;
                }
              });
              topicState.resSuccess({
                res: {
                  data: resJSON,
                },
                prompts: updatePrompts,
                topicSeed: topicState.topicSeeds,
              });
            } else {
              console.error("resError: Invalid JSON data", resJSON);
              const responsePrompt = topicState.prompts[targetIndex];
              topicState.topicSeeds.forEach((seed) => {
                if (seed == responsePrompt.seedData) {
                  seed.requireUpdate = false;
                }
              });
              topicState.resError({
                error: new Error("Invalid JSON data"),
                prompts: updatePrompts,
                topicSeed: topicState.topicSeeds,
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
            topicState.resError({
              error: e,
              prompts: updatePrompts,
              topicSeed: topicState.topicSeeds,
            });
          });
      };

      handleRequest();
    }
  }, [topicState.processing, topicState.prompts, topicState.res]);

}
*/
