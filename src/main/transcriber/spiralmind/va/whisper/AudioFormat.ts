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

export const AudioFormat = {
  UNDEFINED: 'UNDEFINED',
  ENCODING_MASK: 'ENCODING_MASK',
  TYPE_MASK: 'TYPE_MASK',
  NUMBER_OF_BIT_MASK: 'NUMBER_OF_BIT_MASK',
  ENDIAN_MASK: 'ENDIAN_MASK',
  SIGNED_INT: 'SIGNED_INT',
  UNSIGNED_INT: 'UNSIGNED_INT',
  FLOAT: 'FLOAT',
  NUMBER_OF_BIT8: 'NUMBER_OF_BIT8',
  NUMBER_OF_BIT16: 'NUMBER_OF_BIT16',
  NUMBER_OF_BIT24: 'NUMBER_OF_BIT24',
  NUMBER_OF_BIT32: 'NUMBER_OF_BIT32',
  NUMBER_OF_BIT64: 'NUMBER_OF_BIT64',
  PCM_S8: 'PCM_S8',
  PCM_S16BE: 'PCM_S16BE',
  PCM_S16LE: 'PCM_S16LE',
  PCM_S24BE: 'PCM_S24BE',
  PCM_S24LE: 'PCM_S24LE',
  PCM_S32BE: 'PCM_S32BE',
  PCM_S32LE: 'PCM_S32LE',
  PCM_S64BE: 'PCM_S64BE',
  PCM_S64LE: 'PCM_S64LE',
  PCM_U8: 'PCM_U8',
  PCM_U16BE: 'PCM_U16BE',
  PCM_U16LE: 'PCM_U16LE',
  PCM_U24BE: 'PCM_U24BE',
  PCM_U24LE: 'PCM_U24LE',
  PCM_U32BE: 'PCM_U32BE',
  PCM_U32LE: 'PCM_U32LE',
  PCM_U64BE: 'PCM_U64BE',
  PCM_U64LE: 'PCM_U64LE',
  PCM_F32BE: 'PCM_F32BE',
  PCM_F32LE: 'PCM_F32LE',
  PCM_F64BE: 'PCM_F64BE',
  PCM_F64LE: 'PCM_F64LE',
  OPUS: 'OPUS',
} as const;

export type AudioFormat =
  | 'UNDEFINED'
  | 0
  | 'ENCODING_MASK'
  | 64
  | 'TYPE_MASK'
  | 48
  | 'NUMBER_OF_BIT_MASK'
  | 14
  | 'ENDIAN_MASK'
  | 1
  | 'SIGNED_INT'
  | 16
  | 'UNSIGNED_INT'
  | 32
  | 'FLOAT'
  | 48
  | 'NUMBER_OF_BIT8'
  | 2
  | 'NUMBER_OF_BIT16'
  | 4
  | 'NUMBER_OF_BIT24'
  | 6
  | 'NUMBER_OF_BIT32'
  | 8
  | 'NUMBER_OF_BIT64'
  | 10
  | 'PCM_S8'
  | 18
  | 'PCM_S16BE'
  | 20
  | 'PCM_S16LE'
  | 21
  | 'PCM_S24BE'
  | 22
  | 'PCM_S24LE'
  | 23
  | 'PCM_S32BE'
  | 24
  | 'PCM_S32LE'
  | 25
  | 'PCM_S64BE'
  | 26
  | 'PCM_S64LE'
  | 27
  | 'PCM_U8'
  | 34
  | 'PCM_U16BE'
  | 36
  | 'PCM_U16LE'
  | 37
  | 'PCM_U24BE'
  | 38
  | 'PCM_U24LE'
  | 39
  | 'PCM_U32BE'
  | 40
  | 'PCM_U32LE'
  | 41
  | 'PCM_U64BE'
  | 42
  | 'PCM_U64LE'
  | 43
  | 'PCM_F32BE'
  | 56
  | 'PCM_F32LE'
  | 57
  | 'PCM_F64BE'
  | 58
  | 'PCM_F64LE'
  | 59
  | 'OPUS'
  | 64

export type AudioFormat__Output = typeof AudioFormat[keyof typeof AudioFormat]
