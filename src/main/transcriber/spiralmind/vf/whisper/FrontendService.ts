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

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { TranscribeRequest as _spiralmind_vf_whisper_TranscribeRequest, TranscribeRequest__Output as _spiralmind_vf_whisper_TranscribeRequest__Output } from '../../../spiralmind/vf/whisper/TranscribeRequest.js';
import type { TranscribeResponse as _spiralmind_vf_whisper_TranscribeResponse, TranscribeResponse__Output as _spiralmind_vf_whisper_TranscribeResponse__Output } from '../../../spiralmind/vf/whisper/TranscribeResponse.js';

export interface FrontendServiceClient extends grpc.Client {
  Transcribe(metadata: grpc.Metadata, options?: grpc.CallOptions): grpc.ClientDuplexStream<_spiralmind_vf_whisper_TranscribeRequest, _spiralmind_vf_whisper_TranscribeResponse__Output>;
  Transcribe(options?: grpc.CallOptions): grpc.ClientDuplexStream<_spiralmind_vf_whisper_TranscribeRequest, _spiralmind_vf_whisper_TranscribeResponse__Output>;
  transcribe(metadata: grpc.Metadata, options?: grpc.CallOptions): grpc.ClientDuplexStream<_spiralmind_vf_whisper_TranscribeRequest, _spiralmind_vf_whisper_TranscribeResponse__Output>;
  transcribe(options?: grpc.CallOptions): grpc.ClientDuplexStream<_spiralmind_vf_whisper_TranscribeRequest, _spiralmind_vf_whisper_TranscribeResponse__Output>;
  
}

export interface FrontendServiceHandlers extends grpc.UntypedServiceImplementation {
  Transcribe: grpc.handleBidiStreamingCall<_spiralmind_vf_whisper_TranscribeRequest__Output, _spiralmind_vf_whisper_TranscribeResponse>;
  
}

export interface FrontendServiceDefinition extends grpc.ServiceDefinition {
  Transcribe: MethodDefinition<_spiralmind_vf_whisper_TranscribeRequest, _spiralmind_vf_whisper_TranscribeResponse, _spiralmind_vf_whisper_TranscribeRequest__Output, _spiralmind_vf_whisper_TranscribeResponse__Output>
}
