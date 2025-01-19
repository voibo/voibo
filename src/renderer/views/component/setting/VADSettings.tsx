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

/*
export const VADSettings = () => {
  const state = useVBSettingsStore((state) => state);
  const dispatch = useVBSettingsStore((state) => state.settingDispatch);
  return (
    <div className="flex flex-col p-4 rounded border">
      <div>Voice Active Detection</div>
      <div className="text-xs">note: 1 frame = 0.096 sec</div>
      <div className="m-4 grid grid-cols-4 gap-3">
        <div className="col-span-3">
          <div>Positive %</div>
          <div className="text-xs">
            determines the threshold over which a probability is considered to
            indicate the presence of speech.
          </div>
        </div>
        <TextField
          className="w-24"
          label="Positive %"
          variant="outlined"
          value={state.positiveSpeechThreshold}
          size="small"
          type="number"
          onChange={(event) => {
            dispatch({
              type: "setVADSettings",
              payload: {
                positiveSpeechThreshold: Number(event.target.value),
              },
            });
          }}
        />

        <div className="col-span-3">
          <div>minSpeech %</div>
          <div className="text-xs">
            minimum number of speech-positive frames for a speech segment.
          </div>
        </div>
        <TextField
          className="w-24"
          label="minSpeech:10ms"
          variant="outlined"
          value={state.minSpeechFrames}
          size="small"
          type="number"
          onChange={(event) => {
            dispatch({
              type: "setVADSettings",
              payload: {
                minSpeechFrames: Number(event.target.value),
              },
            });
          }}
        />

        <div className="col-span-3">
          <div>preSpeechPad</div>
          <div className="text-xs">
            number of audio frames to prepend to a speech segment.
          </div>
        </div>
        <TextField
          className="w-24"
          label="preSpeechPad:10ms"
          variant="outlined"
          value={state.preSpeechPadFrames}
          size="small"
          type="number"
          onChange={(event) => {
            dispatch({
              type: "setVADSettings",
              payload: {
                preSpeechPadFrames: Number(event.target.value),
              },
            });
          }}
        />

        <div className="col-span-3">
          <div>Negative %</div>
          <div className="text-xs">
            determines the threshold under which a probability is considered to
            indicate the absence of speech.
          </div>
        </div>
        <TextField
          className="w-24"
          label="Negative %"
          variant="outlined"
          value={state.negativeSpeechThreshold}
          size="small"
          type="number"
          onChange={(event) => {
            dispatch({
              type: "setVADSettings",
              payload: {
                negativeSpeechThreshold: Number(event.target.value),
              },
            });
          }}
        />

        <div className="col-span-3">
          <div>redemption</div>
          <div className="text-xs">
            number of speech-negative frames to wait before ending a speech
            segment.
          </div>
        </div>
        <TextField
          className="w-24"
          label="redemption:10ms"
          variant="outlined"
          value={state.redemptionFrames}
          size="small"
          type="number"
          onChange={(event) => {
            dispatch({
              type: "setVADSettings",
              payload: {
                redemptionFrames: Number(event.target.value),
              },
            });
          }}
        />
      </div>
    </div>
  );
};
*/
