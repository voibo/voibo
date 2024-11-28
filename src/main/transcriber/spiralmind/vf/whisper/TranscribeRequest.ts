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
// Original file: src/server/lib/frontend.proto

import type { TranscribeOptions as _spiralmind_vf_whisper_TranscribeOptions, TranscribeOptions__Output as _spiralmind_vf_whisper_TranscribeOptions__Output } from '../../../spiralmind/vf/whisper/TranscribeOptions.js';
import type { DivideOptions as _spiralmind_vf_whisper_DivideOptions, DivideOptions__Output as _spiralmind_vf_whisper_DivideOptions__Output } from '../../../spiralmind/vf/whisper/DivideOptions.js';
import type { RawAudio as _spiralmind_vf_whisper_RawAudio, RawAudio__Output as _spiralmind_vf_whisper_RawAudio__Output } from '../../../spiralmind/vf/whisper/RawAudio.js';
import type { WAVAudio as _spiralmind_vf_whisper_WAVAudio, WAVAudio__Output as _spiralmind_vf_whisper_WAVAudio__Output } from '../../../spiralmind/vf/whisper/WAVAudio.js';

export interface TranscribeRequest {
  'id'?: (string);
  'timestamp'?: (number | string);
  'options'?: (_spiralmind_vf_whisper_TranscribeOptions | null);
  'divideOptions'?: (_spiralmind_vf_whisper_DivideOptions | null);
  'raw'?: (_spiralmind_vf_whisper_RawAudio | null);
  'wav'?: (_spiralmind_vf_whisper_WAVAudio | null);
  'audio'?: "raw"|"wav";
}

export interface TranscribeRequest__Output {
  'id': (string);
  'timestamp': (number);
  'options': (_spiralmind_vf_whisper_TranscribeOptions__Output | null);
  'divideOptions': (_spiralmind_vf_whisper_DivideOptions__Output | null);
  'raw'?: (_spiralmind_vf_whisper_RawAudio__Output | null);
  'wav'?: (_spiralmind_vf_whisper_WAVAudio__Output | null);
  'audio': "raw"|"wav";
}
