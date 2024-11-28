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

import type { Text as _spiralmind_vf_whisper_Text, Text__Output as _spiralmind_vf_whisper_Text__Output } from '../../../spiralmind/vf/whisper/Text.js';

export interface Segment {
  'timestamp'?: (number | string);
  'length'?: (number | string);
  'texts'?: (_spiralmind_vf_whisper_Text)[];
}

export interface Segment__Output {
  'timestamp': (number);
  'length': (number);
  'texts': (_spiralmind_vf_whisper_Text__Output)[];
}
