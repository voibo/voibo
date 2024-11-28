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

export const DivisionMode = {
  DIVISION_MODE_NONE: 'DIVISION_MODE_NONE',
  DIVISION_MODE_FIXED: 'DIVISION_MODE_FIXED',
  DIVISION_MODE_SILENCE: 'DIVISION_MODE_SILENCE',
} as const;

export type DivisionMode =
  | 'DIVISION_MODE_NONE'
  | 0
  | 'DIVISION_MODE_FIXED'
  | 1
  | 'DIVISION_MODE_SILENCE'
  | 2

export type DivisionMode__Output = typeof DivisionMode[keyof typeof DivisionMode]
