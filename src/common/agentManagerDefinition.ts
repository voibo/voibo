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
// == Key of CustomField
export const ATTACHED_MESSAGE_ID = "ATTACHED_MESSAGE_ID";
export const IS_JSON = "IS_JSON";
export const CONNECTED_MESSAGE_IDS = "CONNECTED_MESSAGE_IDS";
export const STRUCTURED_OUTPUT_SCHEMA = "STRUCTURED_OUTPUT_SCHEMA";
export const REACT_COMPONENT = "REACT_COMPONENT";

export const AGENDA_IDS = "AGENDA_IDS";
export const CONTEXT = "CONTEXT";
export const AGENDA_CONTEXT = "AGENDA_CONTEXT";
export const AGENDAS = "AGENDAS";

export interface Message extends Content {
  type: "message";
  speaker: "ai" | "human";
  isJSON: boolean;
  reactComponent?: string;
  error?: string;
  customField?: Record<string, any>;
}

export function getDefaultMessage(): Message {
  return {
    ...getDefaultContent(),
    type: "message",
    speaker: "ai",
    isJSON: false,
  };
}

export function isMessage(content: any): content is Message {
  return (
    // Contentのプロパティを確認
    content !== null &&
    typeof content === "object" &&
    typeof content.id === "string" &&
    Array.isArray(content.connectedMessageIds) &&
    content.connectedMessageIds.every((id: any) => typeof id === "string") &&
    typeof content.content === "string" &&
    typeof content.position === "object" &&
    typeof content.position.x === "number" &&
    typeof content.position.y === "number" &&
    typeof content.width === "number" &&
    // Messageのプロパティを確認
    content.type === "message" &&
    (content.speaker === "ai" || content.speaker === "human") &&
    typeof content.isJSON === "boolean" &&
    (content.reactComponent === undefined ||
      typeof content.reactComponent === "string") &&
    (content.error === undefined || typeof content.error === "string") &&
    (content.customField === undefined ||
      (typeof content.customField === "object" &&
        content.customField !== null &&
        !Array.isArray(content.customField)))
  );
}

export type InvokeResult = {
  message: Message;
  startTimestamp: number;
  assistantName: string;
  dataThreadId: string;
};

/**
 * Assistant ごとのAIデータ
 * 会話のスレッドとそのメッセージの情報を持つ
 */
export type AssistantAIData = {
  startTimestamp: number;
  messages: Array<Message>;
};

// Langchain agentExecutor 用の型定義
export type LangChainAgentResponse = {
  content: string;
  threadId: string;
  runId: string;
  output?: string;
  fileIds?: string[];
};

// == Virtual Assistant ==
export const GENERAL_ASSISTANT_NAME = "General Assistant";

// == LangChain ==

export const TopicSchema =
  'z.object({\n  topics: z\n    .array(\n      z.object({\n        title: z.string().describe("Title of the topic"),\n        topic: z.array(z.string().describe("Key points of the summary")),\n        classification: z.enum([\n          "Report",\n          "Discussion",\n          "Decision/Approval",\n          "Planning/Action Items",\n          "Information Sharing",\n          "Education/Training",\n          "Casual/Informal Conversation"\n        ]).describe("Classification category of the topic"),\n        category: z.enum([\n          "Technology",\n          "Legal/Compliance",\n          "HR/Labor",\n          "Customer Response",\n          "Marketing/Sales Strategy",\n          "Unknown"\n        ]).describe("Topic category"),\n      })\n    )\n    .describe("Array of topics"),\n});';

export const TargetClassificationDetail = [
  {
    label: "all",
    definition: "Any categories.",
  },
  {
    label: "Report/Feedback",
    definition:
      "Sessions designed to share the current status and progress, and to provide feedback. Examples include project progress reports, problem reports, and financial reports.",
  },
  {
    label: "Discussion",
    definition:
      "Exchange of opinions or solutions to specific themes. Examples include strategic planning, problem-solving discussions, and discussions for decision-making.",
  },
  {
    label: "Decision/Approval",
    definition:
      "Discussions aimed at obtaining concrete decisions or approvals. Examples include policy decisions, new project approvals, and budget approvals.",
  },
  {
    label: "Planning/Action Items",
    definition:
      "Determining concrete action plans and next steps resulting from discussions. Examples include task assignments, schedule confirmations, and resource allocations.",
  },
  {
    label: "Information Sharing",
    definition:
      "Sessions to share important information. Examples include market trends, introductions to new technologies, and industry news.",
  },
  {
    label: "Education/Training",
    definition:
      "Sessions to provide skills and knowledge. Examples include training, workshops, and education on new systems or processes.",
  },
  {
    label: "Casual/Informal Conversation",
    definition:
      "Light conversations and informal exchanges. Examples include icebreakers, team building, and light topics about recent events.",
  },
];

export const TargetClassification = [
  "all",
  "Report/Feedback",
  "Discussion",
  "Decision/Approval",
  "Planning/Action Items",
  "Information Sharing",
  "Education/Training",
  "Casual/Informal Conversation",
] as const;
export type TargetClassification = (typeof TargetClassification)[number];

export function getTargetClassificationDetail(
  label: TargetClassification
): string {
  return (
    TargetClassificationDetail.find((d) => d.label === label)?.definition ?? ""
  );
}

export const TargetCategoryDetail = [
  {
    label: "Technology",
    definition:
      "Introduction of new technology, system updates, problem-solving in technology, etc.",
  },
  {
    label: "Legal/Compliance",
    definition:
      "Sharing information on laws and regulations, discussing countermeasures, etc.",
  },
  {
    label: "HR/Labor",
    definition:
      "Personnel policies, recruitment, training programs, labor issues, etc.",
  },
  {
    label: "Customer Response",
    definition:
      "Responding to customer feedback, handling complaints, new customer service strategies, etc.",
  },
  {
    label: "Marketing/Sales Strategy",
    definition:
      "Sales tactics, marketing campaigns, sales strategies, customer data analysis, etc.",
  },
  {
    label: "Education/Training",
    definition:
      "Training sessions, skill development workshops, educational programs, etc.",
  },
  {
    label: "Unknown",
    definition: "If it does not fall under the above categories.",
  },
];

export const TargetCategory = [
  "Technology",
  "Legal/Compliance",
  "HR/Labor",
  "Customer Response",
  "Marketing/Sales Strategy",
  "Education/Training",
  "Unknown",
] as const;
export type TargetCategory = (typeof TargetCategory)[number];

export function getTargetCategoryDetail(label: TargetCategory): string {
  return TargetCategoryDetail.find((d) => d.label === label)?.definition ?? "";
}

export const TopicZodSchema = z.object({
  topics: z
    .array(
      z.object({
        title: z.string().describe("Title of the topic"),
        topic: z.array(z.string().describe("Key points of the summary")),
        classification: z
          .enum(TargetClassification)
          .describe("Classification category of the topic"),
        category: z.enum(TargetCategory).describe("Topic category"),
        continueFromPrevious: z
          .boolean()
          .optional()
          .describe("Continue from the previous topic"),
      })
    )
    .describe("Array of topics"),
});

export const EnglishTopicPrompt: string = `
From now on, I will convert the meeting audio recordings into text and provide them to you sequentially. Correct any misrecognitions, misinterpretations, homophones, or unnatural phrasing in Japanese, and classify the text by topic.

# Instructions for Creation:
- Language to use: Create the text in natural Japanese phrasing.
- Summary by topic: Summarize the main points concisely for each topic without omitting too much information, and add a classification category. Also, if the topic falls under a topic category, include the category as well.
- Handling of Immediate Previous Content: Do not include the immediate previous content in the resulting topics. Use it only to determine if the content continues from the immediate previous content.

### Classification Categories
-	Report/Feedback: Sessions designed to share the current status and progress, and to provide feedback. Examples include project progress reports, problem reports, and financial reports.
-	Discussion: Exchange of opinions or solutions to specific themes. Examples include strategic planning, problem-solving discussions, and discussions for decision-making.
- Decision/Approval: Discussions aimed at obtaining concrete decisions or approvals. Examples include policy decisions, new project approvals, and budget approvals.
- Planning/Action Items: Determining concrete action plans and next steps resulting from discussions. Examples include task assignments, schedule confirmations, and resource allocations.
- Information Sharing: Sessions to share important information. Examples include market trends, introductions to new technologies, and industry news.
- Education/Training: Sessions to provide skills and knowledge. Examples include training, workshops, and education on new systems or processes.
-	Casual/Informal Conversation: Light conversations and informal exchanges. Examples include icebreakers, team building, and light topics about recent events.

### Topic Categories
- Technology: Introduction of new technology, system updates, problem-solving in technology, etc.
- Legal/Compliance: Sharing information on laws and regulations, discussing countermeasures, etc.
- HR/Labor: Personnel policies, recruitment, training programs, labor issues, etc.
- Customer Response: Responding to customer feedback, handling complaints, new customer service strategies, etc.
- Marketing/Sales Strategy: Sales tactics, marketing campaigns, sales strategies, customer data analysis, etc.
- Education/Training: Training sessions, skill development workshops, educational programs, etc.
- Unknown: If it does not fall under the above categories.

### Output Format
Output each topic in the following format:
- {format_instructions}
`;

export const MindMapSchema = z.object({
  code: z
    .string()
    .describe(
      "Mermaid.js形式テキストのマインドマップ。ラベルは double quotes で囲むこと。"
    ),
});

export type ModelType =
  | "gpt-4"
  | "gpt-3.5"
  | "llama3"
  | "claude-3-sonnet"
  | "claude-3-opus"
  | "gemini-1.5-pro"
  | "gemini-1.5-flash"
  | "dify"
  | "flowise"
  | "langGraph";
export const ModelType = new Map<
  ModelType,
  { label: string; value: ModelType }
>([
  ["gpt-4", { label: "GPT-4o", value: "gpt-4" }],
  ["gpt-3.5", { label: "GPT-3.5 Turbo", value: "gpt-3.5" }],
  ["llama3", { label: "Llama3 70B", value: "llama3" }],
  ["claude-3-sonnet", { label: "Claude-3 Sonnet", value: "claude-3-sonnet" }],
  ["claude-3-opus", { label: "Claude-3 Opus", value: "claude-3-opus" }],
  ["gemini-1.5-pro", { label: "Gemini-1.5 Pro", value: "gemini-1.5-pro" }],
  [
    "gemini-1.5-flash",
    { label: "Gemini-1.5 Flash", value: "gemini-1.5-flash" },
  ],
  ["dify", { label: "Dify Service", value: "dify" }],
  ["flowise", { label: "Local Flowise", value: "flowise" }],
  ["langGraph", { label: "LangGraph", value: "langGraph" }],
]);

export type LangGraphConf = {
  langGraphID: string;
};

export type DifyConf = {
  apiKey: string;
  serverUrl: string;
};

export type FlowiseConf = {
  apiKey: string;
  chatFlowID: string;
};

export type TopicInvokeParam = {
  inputPrompt: string;
  systemPrompt?: string;
  structuredOutputSchema?: string;
  modelType?: ModelType;
  temperature?: number;
  field?: Record<string, any>;
  difyConf?: DifyConf;
  flowiseConf?: FlowiseConf;
  langGraphConf?: LangGraphConf;
};

export type VAMessageConf = {
  startTimestamp: number;
  assistantId: string;
  threadId: string;
  connectedMessageIds: Array<string>;
  zodSchema?: z.ZodTypeAny;
  attachHistoryLimit?: number;
  reactComponent?: string;
};

import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  isBaseMessage,
} from "@langchain/core/messages";
import { z } from "zod";
import { Content, getDefaultContent } from "../renderer/views/store/Content.js";

export type LangChainMessage = AIMessage | HumanMessage;
export function isLangChainHumanMessage(obj: any): obj is HumanMessage {
  return isBaseMessage(obj) && obj instanceof HumanMessage;
}
export function isLangChainAIMessage(obj: any): obj is AIMessage {
  return isBaseMessage(obj) && obj instanceof AIMessage;
}
export function isLangChainBaseMessage(obj: any): obj is BaseMessage {
  return isBaseMessage(obj);
}

// Custom Field
// request type related VirtualAssistantRequester
export type TypicalRequestType =
  | "MindMap"
  | "Ideation"
  | "Facilitate"
  | "Summarize";

export type TypicalRequest = {
  type: TypicalRequestType;
  label: string;
  value: string;
};

// == Zod Schema ==

/*
{
 keywords : [
    {
      keyword: "キーワード"
    }
 ]
}
*/
export const PickupKeywordSchema = z.object({
  keywords: z.array(z.string().describe("キーワード")),
});
