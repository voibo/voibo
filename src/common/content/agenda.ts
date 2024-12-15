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
import { TargetCategory, TargetClassification } from "./assisatant.js";
import { Content } from "./content.js";

// == Agenda ==
export type TimeRange = {
  startFromMStartMsec: number;
  endFromMStartMsec: number;
};

export type AgendaStatus =
  | "waiting" // waiting for discussion
  | "inProgress" // in progress
  | "mayBeDone" // may be done that detected by the system
  | "done"; // done that detected by the human

export const AgendaStatusDetail: Array<{
  label: string;
  value: AgendaStatus;
  detail: string;
}> = [
  {
    value: "waiting",
    label: "Waiting",
    detail: "waiting for discussion",
  },
  {
    value: "inProgress",
    label: "In Progress",
    detail: "in progress",
  },
  {
    value: "mayBeDone",
    label: "May Be Done",
    detail: "may be done that detected by the system",
  },
  {
    value: "done",
    label: "Done",
    detail: "done that detected by the human",
  },
];

export interface Agenda extends Content {
  type: "agenda";
  // data
  title: string;
  detail: string;

  classification: TargetClassification;
  category: TargetCategory;
  status: AgendaStatus;
  // optional
  estimateMinutes?: number;
  discussedTimes: TimeRange[];
}
