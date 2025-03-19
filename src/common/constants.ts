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

// renderer -> main
export const IPCSenderKeys = {
  SEND_MESSAGE: "sendMessage",
  SEND_SOUND_BUFFER: "sendSoundBuffer",
  START_TRANSCRIBE: "startTranscribe",
  END_TRANSCRIBE: "endTranscribe",
  PUSH_WAV: "saveWav",
  RE_TRANSCRIBE_ALL: "reTranscribeAll",
  DELETE_MINUTES: "deleteMinutes",
  CREATE_MINUTES: "createMinutes",
  SCREEN_CAPTURE_TARGET_SELECTED: "screenCaptureTargetSelected",
} as const;
export type IPCSenderKeys = (typeof IPCSenderKeys)[keyof typeof IPCSenderKeys];

// main -> renderer
export const IPCReceiverKeys = {
  RECEIVE_MESSAGE: "receiveMessage",
  ON_TRANSCRIBED_INTERIM: "onTranscribeInterim",
  ON_TRANSCRIBED: "onTranscribe",
  ON_SCREEN_CAPTURED: "onScreenCapture",
  REQUESTED_TRANSCRIBE: "startTranscribe",
  PREPARE_TRANSCRIBE: "prepareTranscribe",
  ON_MIND_MAP_CREATED: "onMindMapCreated",
} as const;
export type IPCReceiverKeys =
  (typeof IPCReceiverKeys)[keyof typeof IPCReceiverKeys];

// renderer -> main -> renderer
export const IPCInvokeKeys = {
  GET_VB_MAIN_STORE: "getVAConfig",
  UPDATE_VA_CONFIG: "updateVAConfig",

  GET_AUDIO_FOLDER_PATH: "getAudioFolderPath",
  GET_TOPIC: "getTopic",
  OPEN_FILE_DIALOG: "openFileDialog",
  SAVE_MINUTES: "saveMinutes",
  GET_NONCE: "getNonce",
  SAVE_WAV_AND_TRANSLATE: "saveWavAndTranslate",
  // langchain
  LANGCHAIN_ASSISTANT_MODIFY: "langchain_assistant_modify",
  LANGCHAIN_ASSISTANT_INVOKE: "langchain_assistant_invoke",
  LANGCHAIN_PREPARE_TARGET_MINUTES: "langchain_prepare_targetMinutes",
  LANGCHAIN_INITIALIZE_TARGET_MINUTES: "langchain_initialize_targetMinutes",
  LANGCHAIN_GET_DETAIL_ON_OPEN_AI: "langchain_retrieve_message",
  LANGCHAIN_RETRIEVE_FILE: "langchain_retrieve_file",

  // team
  GET_CURRENT_TEAM: "getCurrentTeam",
  SET_TEAMS: "setTeams",
  GET_TEAMS: "getTeams",

  // screen capture
  ENUM_MEDIA_CAPTURE_TARGETS: "enumerateMediaCaptureTargets",
} as const;
export type IPCInvokeKeys = (typeof IPCInvokeKeys)[keyof typeof IPCInvokeKeys];
