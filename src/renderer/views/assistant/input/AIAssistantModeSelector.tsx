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
import {
  Forum,
  LinkOffOutlined,
  LinkOutlined,
  SummarizeOutlined,
} from "@mui/icons-material";
import { ToggleButton, ToggleButtonGroup, Tooltip } from "@mui/material";
import { Dispatch, useEffect } from "react";
import {
  AssistantAction,
  AssistantState,
  AttachmentMode,
} from "../../store/useAssistantsStore.jsx";
import { VFAction, VFState } from "../../store/useVFStore.jsx";

export const AIAssistantModeSelector = (props: {
  stateAI: AssistantState;
  dispatchAI: Dispatch<AssistantAction>;
  vfState: VFState;
  vfDispatch: Dispatch<VFAction>;
}) => {
  const { stateAI, dispatchAI, vfState, vfDispatch } = props;

  const isSomeSelected = vfState.topics.some(
    (topic) => topic.selected ?? false
  );

  const handleAttachment = (event: React.MouseEvent, value: string) => {
    let attachment: AttachmentMode = "none";
    switch (value) {
      case "discussion":
        attachment = "discussion";
        break;
      case "topic":
        attachment = "topic";
        break;
      default:
        attachment = "none";
        break;
    }
    dispatchAI({
      type: "setAttachment",
      payload: {
        attachmentMode: attachment,
      },
    });
  };

  useEffect(() => {
    if (isSomeSelected) {
      dispatchAI({
        type: "setAttachment",
        payload: {
          attachmentMode: "topic",
        },
      });
    } else {
      dispatchAI({
        type: "setAttachment",
        payload: {
          attachmentMode: "none",
        },
      });
    }
  }, [isSomeSelected]);

  return (
    <div className="flex flex-row items-center mx-2 mb-1">
      <Tooltip title="Attached selected context with message">
        <LinkOutlined className="mr-4" sx={{ fontSize: "1rem" }} />
      </Tooltip>
      <ToggleButtonGroup
        size="small"
        exclusive
        onChange={handleAttachment}
        value={stateAI.attachment}
      >
        <ToggleButton
          value="topic"
          disabled={!isSomeSelected || stateAI.onProcess}
        >
          <Tooltip title="Minutes">
            <SummarizeOutlined sx={{ fontSize: "1rem" }} />
          </Tooltip>
        </ToggleButton>
        <ToggleButton
          value="discussion"
          disabled={!isSomeSelected || stateAI.onProcess}
        >
          <Tooltip title="Discussion">
            <Forum sx={{ fontSize: "1rem" }} />
          </Tooltip>
        </ToggleButton>
        <ToggleButton value="none">
          <Tooltip title="Without Context">
            <LinkOffOutlined sx={{ fontSize: "1rem" }} />
          </Tooltip>
        </ToggleButton>
      </ToggleButtonGroup>
    </div>
  );
};
