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

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { TranscribeRequest as _spiralmind_va_whisper_TranscribeRequest, TranscribeRequest__Output as _spiralmind_va_whisper_TranscribeRequest__Output } from '../../../spiralmind/va/whisper/TranscribeRequest.js';
import type { TranscribeResult as _spiralmind_va_whisper_TranscribeResult, TranscribeResult__Output as _spiralmind_va_whisper_TranscribeResult__Output } from '../../../spiralmind/va/whisper/TranscribeResult.js';

export interface WhisperServiceClient extends grpc.Client {
  Transcribe(metadata: grpc.Metadata, options?: grpc.CallOptions): grpc.ClientDuplexStream<_spiralmind_va_whisper_TranscribeRequest, _spiralmind_va_whisper_TranscribeResult__Output>;
  Transcribe(options?: grpc.CallOptions): grpc.ClientDuplexStream<_spiralmind_va_whisper_TranscribeRequest, _spiralmind_va_whisper_TranscribeResult__Output>;
  transcribe(metadata: grpc.Metadata, options?: grpc.CallOptions): grpc.ClientDuplexStream<_spiralmind_va_whisper_TranscribeRequest, _spiralmind_va_whisper_TranscribeResult__Output>;
  transcribe(options?: grpc.CallOptions): grpc.ClientDuplexStream<_spiralmind_va_whisper_TranscribeRequest, _spiralmind_va_whisper_TranscribeResult__Output>;
  
}

export interface WhisperServiceHandlers extends grpc.UntypedServiceImplementation {
  Transcribe: grpc.handleBidiStreamingCall<_spiralmind_va_whisper_TranscribeRequest__Output, _spiralmind_va_whisper_TranscribeResult>;
  
}

export interface WhisperServiceDefinition extends grpc.ServiceDefinition {
  Transcribe: MethodDefinition<_spiralmind_va_whisper_TranscribeRequest, _spiralmind_va_whisper_TranscribeResult, _spiralmind_va_whisper_TranscribeRequest__Output, _spiralmind_va_whisper_TranscribeResult__Output>
}
