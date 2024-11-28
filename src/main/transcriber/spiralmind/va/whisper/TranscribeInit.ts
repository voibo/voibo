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

import type { TranscribeOptions as _spiralmind_va_whisper_TranscribeOptions, TranscribeOptions__Output as _spiralmind_va_whisper_TranscribeOptions__Output } from '../../../spiralmind/va/whisper/TranscribeOptions.js';
import type { AudioParameters as _spiralmind_va_whisper_AudioParameters, AudioParameters__Output as _spiralmind_va_whisper_AudioParameters__Output } from '../../../spiralmind/va/whisper/AudioParameters.js';

export interface TranscribeInit {
  'timestamp'?: (number | string);
  'options'?: (_spiralmind_va_whisper_TranscribeOptions | null);
  'audioParameters'?: (_spiralmind_va_whisper_AudioParameters | null);
}

export interface TranscribeInit__Output {
  'timestamp': (number);
  'options': (_spiralmind_va_whisper_TranscribeOptions__Output | null);
  'audioParameters': (_spiralmind_va_whisper_AudioParameters__Output | null);
}
