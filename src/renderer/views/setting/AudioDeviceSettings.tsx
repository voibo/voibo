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
import { MicOutlined, VolumeUpOutlined } from "@mui/icons-material";
import {
  FormControl,
  FormControlProps,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material";
import { useEffect, useReducer } from "react";
import { useVFSettingsStore } from "../store/useVFSettingStore.jsx";

export type AudioDeviceSettingsState = {
  selectedOwnDeviceId: string;
  selectedParticipantsDeviceId: string;
  selectedOutputDeviceId: string;
};

export const AudioDeviceSettingsDefault: AudioDeviceSettingsState = {
  selectedOwnDeviceId: "default",
  selectedParticipantsDeviceId: "default",
  selectedOutputDeviceId: "default",
};

export type AudioDeviceSettingsAction = {
  type: "setMicSettings";
  payload: Partial<AudioDeviceSettingsState>;
};

export const MicSettings = () => {
  const state = useVFSettingsStore((state) => state);
  const dispatch = useVFSettingsStore((state) => state.settingDispatch);
  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-row items-center">
        <MicOutlined className="mr-2" />
        <MediaSelector
          label={"Record your voice"}
          isAudioInput={true}
          selectedDeviceId={state.selectedOwnDeviceId}
          selectedDeviceIdHandler={(id) => {
            if (id != state.selectedOwnDeviceId) {
              //MediaSelectorの初回起動時にも呼ばれるので、ここでのstate.selectedDeviceIdのチェックは必須
              dispatch({
                type: "setMicSettings",
                payload: {
                  selectedOwnDeviceId: id,
                },
              });
            }
          }}
          className="flex-1"
        />
      </div>
      <div className="flex flex-row items-center justify-center">
        <VolumeUpOutlined className="mr-2" />
        <MediaSelector
          label={"Output Device"}
          isAudioInput={false}
          selectedDeviceId={state.selectedOutputDeviceId}
          selectedDeviceIdHandler={(id) => {
            if (id != state.selectedOutputDeviceId) {
              //MediaSelectorの初回起動時にも呼ばれるので、ここでのstate.selectedDeviceIdのチェックは必須
              dispatch({
                type: "setMicSettings",
                payload: {
                  selectedOutputDeviceId: id,
                },
              });
            }
          }}
          className="mt-4 flex-1"
        />
      </div>
    </div>
  );
};

type MediaSelectorState = {
  devices: MediaDeviceInfo[];
  selectedDeviceId: string;
};
type MediaSelectorAction =
  | {
      type: "setSelectedDeviceId";
      payload: {
        selectedDeviceId: string;
      };
    }
  | {
      type: "setDevices";
      payload: {
        devices: MediaDeviceInfo[];
      };
    };

export const MediaSelector = ({
  label,
  isAudioInput,
  selectedDeviceId,
  selectedDeviceIdHandler,
  ...others
}: {
  label: string;
  isAudioInput: boolean;
  selectedDeviceId: string;
  selectedDeviceIdHandler: (id: string) => void;
} & FormControlProps) => {
  const [state, dispatch] = useReducer(
    (state: MediaSelectorState, action: MediaSelectorAction) => {
      switch (action.type) {
        case "setSelectedDeviceId":
          return {
            ...state,
            selectedDeviceId: action.payload.selectedDeviceId,
          };
        case "setDevices":
          return {
            ...state,
            devices: action.payload.devices,
          };
      }
    },
    {
      devices: [],
      selectedDeviceId: selectedDeviceId,
    }
  );

  async function getMedia() {
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        const filteredDevices = devices.filter(
          (device) =>
            device.kind === (isAudioInput ? "audioinput" : "audiooutput")
        );
        dispatch({
          type: "setDevices",
          payload: {
            devices: filteredDevices,
          },
        });
      })
      .catch((err) => {
        console.log("enumerateDevices ERROR:", err);
      });
  }

  useEffect(() => {
    getMedia();
  }, []);

  useEffect(() => {
    if (state.selectedDeviceId) {
      selectedDeviceIdHandler(state.selectedDeviceId);
    }
  }, [state.selectedDeviceId]);

  const handleChange = (event: any) => {
    if ((event.target.value as string) == state.selectedDeviceId) return;
    dispatch({
      type: "setSelectedDeviceId",
      payload: {
        selectedDeviceId: event.target.value as string,
      },
    });
  };

  return (
    <FormControl {...others}>
      <InputLabel id="media-device-select-label">{label}</InputLabel>
      <Select
        labelId="media-device-select-label"
        label={label}
        value={state.selectedDeviceId}
        onChange={handleChange}
      >
        {state.devices.map((device) => {
          return (
            <MenuItem key={device.deviceId} value={device.deviceId}>
              {device.label}
            </MenuItem>
          );
        })}
      </Select>
    </FormControl>
  );
};
