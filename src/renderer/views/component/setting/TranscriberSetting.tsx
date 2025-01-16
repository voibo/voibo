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
import { useState } from "react";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
} from "@mui/material";
import { VADSettings } from "./VADSettings.jsx";
import { useVBMainStore } from "../../store/useVBMainStore.jsx";
import { TranscriberType } from "../../../../common/electronStore.js";

export const TranscriberSetting = () => {
  const vaConfStore = useVBMainStore();

  const handleTranscriberChange = (
    event: SelectChangeEvent<TranscriberType>
  ) => {
    vaConfStore.update({
      ...vaConfStore.conf!, // loadされたあとなので必ず存在するはず
      transcriber: event.target.value as TranscriberType,
    });
  };
  const transcribers = [
    { label: "Google Speech-to-Text", value: "stt" },
    //{ label: "whisper v3 with local Wav file", value: "localWav" },
  ];
  const [state_WHISPER_EXEC_PATH, set_WHISPER_EXEC_PATH] = useState(
    vaConfStore.conf!.WHISPER_EXEC_PATH
  );

  const [state_STT_PROJECT_ID, set_STT_PROJECT_ID] = useState(
    vaConfStore.conf!.GOOGLE_TTS_PROJECT_ID
  );
  const [state_STT_CLIENT_EMAIL, set_STT_CLIENT_EMAIL] = useState(
    vaConfStore.conf!.GOOGLE_TTS_CLIENT_EMAIL
  );
  const [state_STT_PRIVATE_KEY, set_STT_PRIVATE_KEY] = useState(
    vaConfStore.conf!.GOOGLE_TTS_PRIVATE_KEY
  );
  return (
    <div className="flex flex-col">
      <FormControl fullWidth>
        <InputLabel id="TranscriberType">Transcriber</InputLabel>
        <Select
          fullWidth
          labelId="TranscriberType"
          label={"Transcriber"}
          value={vaConfStore.conf!.transcriber}
          onChange={handleTranscriberChange}
        >
          {transcribers.map((transcriber) => {
            return (
              <MenuItem key={transcriber.value} value={transcriber.value}>
                {transcriber.label}
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>

      {vaConfStore.conf!.transcriber === "stt" && (
        <div className="flex flex-col items-start p-2 rounded border space-y-4 mt-2">
          <div>Google Speech-to-Text</div>
          <TextField
            fullWidth
            label={"Project ID"}
            value={state_STT_PROJECT_ID}
            onChange={(event) => set_STT_PROJECT_ID(event.target.value)}
            onBlur={(event) => {
              vaConfStore.update({
                ...vaConfStore.conf!, // loadされたあとなので必ず存在するはず
                GOOGLE_TTS_PROJECT_ID: event.target.value,
              });
            }}
          ></TextField>

          <TextField
            fullWidth
            label={"Client Email"}
            value={state_STT_CLIENT_EMAIL}
            onChange={(event) => set_STT_CLIENT_EMAIL(event.target.value)}
            onBlur={(event) => {
              vaConfStore.update({
                ...vaConfStore.conf!, // loadされたあとなので必ず存在するはず
                GOOGLE_TTS_CLIENT_EMAIL: event.target.value,
              });
            }}
          ></TextField>

          <TextField
            label={"Private Key"}
            value={state_STT_PRIVATE_KEY}
            multiline
            role="10"
            className="w-96"
            onChange={(event) => set_STT_PRIVATE_KEY(event.target.value)}
            onBlur={(event) => {
              vaConfStore.update({
                ...vaConfStore.conf!, // loadされたあとなので必ず存在するはず
                GOOGLE_TTS_PRIVATE_KEY: event.target.value,
              });
            }}
          ></TextField>
        </div>
      )}
    </div>
  );
};
