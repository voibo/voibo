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
import { Readable, Transform } from 'stream';
import { Format, isFormat } from './format.js';
import { concatInt16Arrays, convertMono } from './utils.js';

export class MonoConverter extends Transform {
    #sourceFormat?: Format;
    #format?: Format;

    #buf?: Int16Array;

    get channels(): number {
        return this.#format?.channels ?? 0;
    }

    get sampleRate(): number {
        return this.#format?.sampleRate ?? 0;
    }

    constructor() {
        super({
            objectMode: true,
        });

        this.on('pipe', (src: Readable) => {
            if (isFormat(src)) {
                this.#setFormat(src);
            }
            src.on('format', (format) => {
                if (isFormat(src)) {
                    this.#setFormat(format);
                }
            });
        });
    }

    #setFormat(format: Format) {
        if (format.channels > 0 && format.sampleRate > 0) {
            this.#sourceFormat = format;
            this.#format = {
                ...format,
                channels: 1,
            };
            this.emit('format', this.#format);
        }
    }

    override _transform(
        chunk: any,
        _: BufferEncoding,
        callback: (error?: Error | null) => void
    ) {
        if (!(chunk instanceof Int16Array)) {
            callback(new Error('unsupported input'));
            return;
        }
        if (this.#sourceFormat == null) {
            callback(new Error('failed to get source format'));
            return;
        }

        const srcChannels = this.#sourceFormat.channels;
        if (srcChannels == 1) {
            this.push(chunk);
            callback();
            return;
        }

        if (this.#buf != null) {
            chunk = concatInt16Arrays(this.#buf, chunk);
        }

        const mono = convertMono(chunk, srcChannels);
        this.push(mono);

        const remaining = chunk.length - mono.length * srcChannels;
        if (remaining == 0) {
            this.#buf = undefined;
        } else {
            this.#buf = chunk.slice(chunk.length - remaining, chunk.length);
        }

        callback();
    }

    override _flush(callback: (error?: Error | null) => void) {
        callback();
    }
}

function normalize(a: number): number {
    if (a > 0) {
        return a / 32767;
    }
    if (a < 0) {
        return a / 32768;
    }

    return 0;
}
