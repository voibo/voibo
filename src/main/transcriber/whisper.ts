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
import type * as grpc from "@grpc/grpc-js";
import type {
  EnumTypeDefinition,
  MessageTypeDefinition,
} from "@grpc/proto-loader";

import type {
  WhisperServiceClient as _spiralmind_va_whisper_WhisperServiceClient,
  WhisperServiceDefinition as _spiralmind_va_whisper_WhisperServiceDefinition,
} from "./spiralmind/va/whisper/WhisperService.js";

type SubtypeConstructor<
  Constructor extends new (...args: any) => any,
  Subtype
> = {
  new (...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  spiralmind: {
    va: {
      whisper: {
        AudioData: MessageTypeDefinition;
        AudioFormat: EnumTypeDefinition;
        AudioParameters: MessageTypeDefinition;
        Segment: MessageTypeDefinition;
        TranscribeData: MessageTypeDefinition;
        TranscribeInit: MessageTypeDefinition;
        TranscribeOptions: MessageTypeDefinition;
        TranscribeRequest: MessageTypeDefinition;
        TranscribeResult: MessageTypeDefinition;
        WhisperService: SubtypeConstructor<
          typeof grpc.Client,
          _spiralmind_va_whisper_WhisperServiceClient
        > & { service: _spiralmind_va_whisper_WhisperServiceDefinition };
      };
    };
  };
}
