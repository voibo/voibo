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
// Original file: ../../proto/whisper.proto

import type { TranscribeInit as _spiralmind_va_whisper_TranscribeInit, TranscribeInit__Output as _spiralmind_va_whisper_TranscribeInit__Output } from '../../../spiralmind/va/whisper/TranscribeInit.js';
import type { TranscribeData as _spiralmind_va_whisper_TranscribeData, TranscribeData__Output as _spiralmind_va_whisper_TranscribeData__Output } from '../../../spiralmind/va/whisper/TranscribeData.js';

export interface TranscribeRequest {
  'init'?: (_spiralmind_va_whisper_TranscribeInit | null);
  'data'?: (_spiralmind_va_whisper_TranscribeData | null);
  'request'?: "init"|"data";
}

export interface TranscribeRequest__Output {
  'init'?: (_spiralmind_va_whisper_TranscribeInit__Output | null);
  'data'?: (_spiralmind_va_whisper_TranscribeData__Output | null);
  'request': "init"|"data";
}
