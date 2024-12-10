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
import { Send } from "@mui/icons-material";
import { Button, Divider, InputBase } from "@mui/material";
import { Dispatch, useEffect, useState } from "react";
import { GENERAL_ASSISTANT_NAME } from "../../../../common/agentManagerDefinition.js";
import {
  AssistantAction,
  AssistantState,
  InvokeAssistantAttachOption,
  makeTopicOrientedInvokeParam,
  useMinutesAssistantStore,
} from "../../store/useAssistantsStore.jsx";
import { VFAction, VFState } from "../../store/useVFStore.jsx";

export const AIAssistantManualInput = (props: {
  state: AssistantState;
  dispatch: Dispatch<AssistantAction>;
  vfState: VFState;
  vfDispatch: Dispatch<VFAction>;
}) => {
  const {
    state: parentState,
    dispatch: parentDispatch,
    vfState,
    vfDispatch,
  } = props;
  const [message, setMessage] = useState<string>("");
  const gaConf = vfState.assistants.find(
    (assistant) => assistant.assistantId === GENERAL_ASSISTANT_NAME
  )!; // Parentで確認済み

  if (!vfState.startTimestamp) {
    return <></>;
  }

  const statePromise = useMinutesAssistantStore(vfState.startTimestamp)
    .getState()
    .getOrInitAssistant(gaConf);
  const dispatch = useMinutesAssistantStore(vfState.startTimestamp)
    .getState()
    .assistantDispatch(gaConf);

  let state: AssistantState | null = null;
  const assistantLoad = async () => {
    state = await statePromise;
  };
  useEffect(() => {
    assistantLoad();
  }, [statePromise]);

  const handleClick = () => {
    console.log("AIAssistantManualInput: handleClick: state.attachment");
    if (!state) {
      return;
    }

    // 注意: fileIDsをHackして利用している
    // 実際に OpenAI APIがファイルをアタッチしてくる場合もあるのと。同一の仕組みのままでデータ保存したいので、あえて構造を変更していない。
    let field;
    switch (state.attachment) {
      case "discussion":
        field = {
          attachment: "discussion",
          type: "manualInput",
          label: message,
        };
        break;
      case "topic":
        field = {
          attachment: "topic",
          type: "manualInput",
          label: message,
        };
        break;
    }

    // for manual input
    let attachOption: InvokeAssistantAttachOption;
    switch (state.attachment) {
      case "discussion":
        attachOption = {
          attachment: "discussion",
          target: "manualSelected",
        };
        break;
      case "topic":
        attachOption = {
          attachment: "topic",
          target: "manualSelected",
        };
        break;
      default:
        attachOption = {
          attachment: "none",
        };
        break;
    }

    console.log("AIAssistantManualInput: handleClick: dispatch", dispatch);
    dispatch({
      type: "invokeAssistant",
      payload: {
        queue: [
          makeTopicOrientedInvokeParam({
            basePrompt: message,
            topics: vfState.topics.filter((topic) => topic.selected),
            attachOption,
            customField: field,
            withoutAgenda: true,
          }),
        ],
      },
    });
    setMessage("");
  };

  let stateOnProcess = state ? true : false; //state ? state.onProcess : false;

  return (
    <div className="flex flex-row rounded-md border m-2 mt-2 w-ful">
      <InputBase
        sx={{ p: "0.5rem", backgroundColor: "white" }}
        placeholder="Prompt"
        multiline
        rows={3}
        value={message}
        onChange={(e) => {
          setMessage(e.target.value);
        }}
        className="flex-grow"
      />
      <Divider sx={{ height: "5.5rem" }} orientation="vertical" />
      <Button
        color="primary"
        disabled={message === "" || stateOnProcess}
        onClick={handleClick}
      >
        <Send />
      </Button>
    </div>
  );
};
