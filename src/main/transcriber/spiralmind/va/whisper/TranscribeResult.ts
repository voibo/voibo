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

import type { Segment as _spiralmind_va_whisper_Segment, Segment__Output as _spiralmind_va_whisper_Segment__Output } from '../../../spiralmind/va/whisper/Segment.js';

export interface TranscribeResult {
  'segments'?: (_spiralmind_va_whisper_Segment)[];
}

export interface TranscribeResult__Output {
  'segments': (_spiralmind_va_whisper_Segment__Output)[];
}
