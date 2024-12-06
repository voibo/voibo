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
import { TextField } from "@mui/material";
import { Dispatch } from "react";

export type CommonSettingsState = {
  openAI_APIKey: string;
  localWhisperPath: string;
};

export const CommonSettingsDefault: CommonSettingsState = {
  openAI_APIKey: "",
  localWhisperPath: "/",
};

export type CommonSettingsAction = {
  type: "setCommonSettings";
  payload: Partial<CommonSettingsState>;
};

export const CommonSettings = (props: {
  state: CommonSettingsState;
  dispatch: Dispatch<CommonSettingsAction>;
}) => {
  const { state, dispatch } = props;
  return (
    <div className="flex flex-col p-4 rounded border">
      <div>Settings</div>
      <div className="text-xs">note: 1 frame = 0.096 sec</div>
      <div className="m-4 grid grid-cols-4 gap-3">
        <div className="col-span-3">
          <div>OpenAI API Key </div>
          <div className="text-xs">
            API key for OpenAI. You can get it from openAI website.
          </div>
        </div>
        <TextField
          className="w-24"
          label="OpenAI API Key"
          variant="outlined"
          value={state.openAI_APIKey}
          size="small"
          type="number"
          onChange={(event) => {
            dispatch({
              type: "setCommonSettings",
              payload: {
                openAI_APIKey: event.target.value,
              },
            });
          }}
        />

        <div className="col-span-3">
          <div>local Whisper Path</div>
          <div className="text-xs">
            Path to the folder where whisper.cpp is saved.
          </div>
        </div>
        <TextField
          className="w-24"
          label="localWhisperPath"
          variant="outlined"
          value={state.localWhisperPath}
          size="small"
          type="number"
          onChange={(event) => {
            dispatch({
              type: "setCommonSettings",
              payload: {
                localWhisperPath: event.target.value,
              },
            });
          }}
        />
      </div>
    </div>
  );
};
