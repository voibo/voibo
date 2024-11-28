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

import type { TranscribeSuccess as _spiralmind_vf_whisper_TranscribeSuccess, TranscribeSuccess__Output as _spiralmind_vf_whisper_TranscribeSuccess__Output } from '../../../spiralmind/vf/whisper/TranscribeSuccess.js';
import type { TranscribeError as _spiralmind_vf_whisper_TranscribeError, TranscribeError__Output as _spiralmind_vf_whisper_TranscribeError__Output } from '../../../spiralmind/vf/whisper/TranscribeError.js';

export interface TranscribeResponse {
  'id'?: (string);
  'success'?: (_spiralmind_vf_whisper_TranscribeSuccess | null);
  'error'?: (_spiralmind_vf_whisper_TranscribeError | null);
  'result'?: "success"|"error";
}

export interface TranscribeResponse__Output {
  'id': (string);
  'success'?: (_spiralmind_vf_whisper_TranscribeSuccess__Output | null);
  'error'?: (_spiralmind_vf_whisper_TranscribeError__Output | null);
  'result': "success"|"error";
}
