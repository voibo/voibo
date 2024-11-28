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
import type * as grpc from '@grpc/grpc-js';
import type { EnumTypeDefinition, MessageTypeDefinition } from '@grpc/proto-loader';

import type { FrontendServiceClient as _spiralmind_vf_whisper_FrontendServiceClient, FrontendServiceDefinition as _spiralmind_vf_whisper_FrontendServiceDefinition } from './spiralmind/vf/whisper/FrontendService.js';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  spiralmind: {
    vf: {
      whisper: {
        Audio: MessageTypeDefinition
        DivideOptions: MessageTypeDefinition
        DivisionMode: EnumTypeDefinition
        FrontendService: SubtypeConstructor<typeof grpc.Client, _spiralmind_vf_whisper_FrontendServiceClient> & { service: _spiralmind_vf_whisper_FrontendServiceDefinition }
        RawAudio: MessageTypeDefinition
        Segment: MessageTypeDefinition
        Text: MessageTypeDefinition
        TranscribeError: MessageTypeDefinition
        TranscribeOptions: MessageTypeDefinition
        TranscribeRequest: MessageTypeDefinition
        TranscribeResponse: MessageTypeDefinition
        TranscribeSuccess: MessageTypeDefinition
        WAVAudio: MessageTypeDefinition
      }
    }
  }
}

