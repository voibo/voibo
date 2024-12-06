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
import { SmartToyOutlined } from "@mui/icons-material";
import { ToggleButton, ToggleButtonGroup, Tooltip } from "@mui/material";
import { Dispatch } from "react";
import { ModelType } from "../../../../main/agent/agentManagerDefinition.js";
import {
  AssistantAction,
  AssistantState,
  VirtualAssistantConf,
} from "../../store/useAssistantsStore.jsx";
import { VFAction, VFState } from "../../store/useVFStore.jsx";

export const AIModelSelector = (props: {
  vaConfig: VirtualAssistantConf;
  stateAI: AssistantState;
  dispatchAI: Dispatch<AssistantAction>;
  vfState: VFState;
  vfDispatch: Dispatch<VFAction>;
}) => {
  const { vaConfig, stateAI, dispatchAI, vfState, vfDispatch } = props;

  const handleModel = (event: React.MouseEvent, value: string) => {
    let modelType: ModelType = "gemini-1.5-flash";
    switch (value) {
      case "gpt-4":
        modelType = "gpt-4";
        break;
      case "claude-3-opus":
        modelType = "claude-3-opus";
        break;
      case "gemini-1.5-pro":
        modelType = "gemini-1.5-pro";
        break;
      case "gemini-1.5-flash":
      default:
        modelType = "gemini-1.5-flash";
        break;
    }

    vfDispatch({
      type: "setVirtualAssistantConf",
      payload: {
        assistant: {
          ...vaConfig,
          aiConfig: {
            ...vaConfig.aiConfig,
            modelType: modelType,
          },
        },
      },
    });
  };

  return (
    <div className="flex flex-row items-center mx-2 mb-1">
      <Tooltip title="AI" className="mr-2">
        <SmartToyOutlined sx={{ fontSize: "1rem" }} />
      </Tooltip>
      <ToggleButtonGroup
        size="small"
        exclusive
        onChange={handleModel}
        value={vaConfig.aiConfig?.modelType ?? "gemini-1.5"}
      >
        <ToggleButton value="gpt-4" disabled={stateAI.onProcess}>
          <Tooltip title="GPT 4o">
            <img src="./asset/chat-gpt-icon.svg" width={20} />
          </Tooltip>
        </ToggleButton>
        <ToggleButton value="claude-3-opus" disabled={stateAI.onProcess}>
          <Tooltip title="Claude 3 Opus">
            <img src="./asset/claude-ai-icon.svg" width={20} />
          </Tooltip>
        </ToggleButton>
        <ToggleButton value="gemini-1.5-flash" disabled={stateAI.onProcess}>
          <Tooltip title="Gemini 1.5 Flash">
            <img src="./asset/google-gemini-icon.svg" width={20} />
          </Tooltip>
        </ToggleButton>
      </ToggleButtonGroup>
    </div>
  );
};
