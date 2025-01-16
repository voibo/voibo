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
import { VBTeam, VBTeams, VBTeamsElectronStore } from "./teams.js";

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
export type ElectronStore = {
  windowState: Partial<WindowState>; // window position and size
  conf: VBMainConf; // va config settings
  teams: VBTeamsElectronStore;
};

export type WindowState = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TranscriberType = "localWav" | "stt";
export type VBMainConf = {
  // == Transcriber ==
  transcriber: TranscriberType;
  GOOGLE_TTS_PROJECT_ID: string;
  GOOGLE_TTS_CLIENT_EMAIL: string;
  GOOGLE_TTS_PRIVATE_KEY: string;
  WHISPER_EXEC_PATH: string;

  //  == LLM ==
  OPENAI_API_KEY: string;
  ANTHROPIC_API_KEY: string;
  GROQ_API_KEY: string;
  GOOGLE_API_KEY: string;
};
