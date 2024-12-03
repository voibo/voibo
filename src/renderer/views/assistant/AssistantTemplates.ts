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
import { AssistantTemplate } from "../store/useAssistantsStore.js";

export const AgendaSummarizerTemplate: AssistantTemplate = {
  templateId: "org.voibo.assistant.agenda_summarizer",
  description: "Summarize the content of the agenda each time it is completed.",
  author: "Voibo",
  config: {
    aiConfig: {
      langGraphConf: {
        langGraphID: "agenda_summarizer",
      },
      modelType: "langGraph",
      systemPrompt: "",
      temperature: 1,
    },
    assistantId: "",
    assistantName: "facilitator",
    assistantType: "va-custom",
    attachOption: {
      attachment: "topic",
      target: "systemFiltered",
    },
    icon: "./asset/cat_robo_iconL.svg",
    initialPrompt: "会話からキーワードだけを検出し、列挙せよ。",
    label: "Agenda Summarizer",
    messageViewMode: "latest_response",
    targetCategory: "Unknown",
    targetClassification: "all",
    updateMode: "at_agenda_completed",
    updatePrompt: "以下が最新の会話内容である。",
  },
};

export const SimpleResearcherTemplate: AssistantTemplate = {
  templateId: "org.voibo.assistant.simple_researcher",
  description:
    "Research and report on the key points contained in the selected contents.",
  author: "Voibo",
  config: {
    aiConfig: {
      langGraphConf: {
        langGraphID: "simple_researcher",
      },
      modelType: "langGraph",
      systemPrompt: "",
      temperature: 1,
    },
    assistantId: "",
    assistantName: "facilitator",
    assistantType: "va-custom",
    attachOption: {
      attachment: "topic",
      target: "manualSelected",
    },
    icon: "./asset/cat_robo_iconL.svg",
    initialPrompt: "会話からキーワードだけを検出し、列挙せよ。",
    label: "Simple Researcher",
    messageViewMode: "latest_response",
    targetCategory: "Unknown",
    targetClassification: "all",
    updateMode: "manual",
    updatePrompt: "以下が最新の会話内容である。",
  },
};

export const SystemDefaultTemplate: Array<AssistantTemplate> = [
  AgendaSummarizerTemplate,
  SimpleResearcherTemplate,
];

export const AssistantTemplates: Array<AssistantTemplate> = [
  ...SystemDefaultTemplate,
];
