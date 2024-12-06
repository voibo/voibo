/*
Copyright 2024 Voibo

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
export function concatBuffers(a: Buffer, b: Buffer): Buffer {
    if (a.length == 0) {
        return b;
    }
    if (b.length == 0) {
        return a;
    }

    const buf = Buffer.alloc(a.length + b.length);
    buf.set(a, 0);
    buf.set(b, a.length);
    return buf;
}

export function concatInt16Arrays(a: Int16Array, b: Int16Array): Int16Array {
    if (a.length == 0) {
        return b;
    }
    if (b.length == 0) {
        return a;
    }

    const array = new Int16Array(a.length + b.length);
    array.set(a, 0);
    array.set(b, a.length);
    return array;
}

// Bufferの中身は 16bit Int をバイト配列で表現したもの
export function audioBufferToInt16Array(buffer: Buffer): Int16Array {
    const samples = Math.trunc(buffer.length / 2);

    const array = new Int16Array(samples);
    for (let i = 0; i < array.length; i++) {
        array[i] = buffer.readInt16LE(i * 2);
    }

    return array;
}

// float32(BE) を
export function audioBufferToUInt16Array2(buffer: Buffer): Int16Array {
    const samples = Math.trunc(buffer.length / 4);

    const array = new Int16Array(samples);
    for (let i = 0; i < array.length; i++) {
        const a = buffer.readFloatBE(i * 4); // 1 ~ -1 の値
        array[i] = float32ToInt16(a);
    }

    return array;
}

export function float32ToInt16(n: number): number {
    // まず、入力値を -1.0 と 1.0 の間に制限します
    const clamped = Math.max(-1, Math.min(1, n));
    // その後、int16の範囲にスケールし、丸めます
    return Math.round(clamped * 0x7fff);
}

export function audioInt16ArrayToBuffer(array: Int16Array): Buffer {
    const buffer = Buffer.alloc(array.byteLength);
    for (let i = 0; i < array.length; i++) {
        buffer.writeInt16LE(array[i], i * 2);
    }

    return buffer;
}

export function convertMono(src: Int16Array, srcChannels: number): Int16Array {
    const size = Math.trunc(src.length / srcChannels);

    const dst = new Int16Array(size);
    for (let i = 0; i < dst.length; i++) {
        let a = 0;
        for (let ch = 0; ch < srcChannels; ch++) {
            a += src[i * srcChannels + ch];
        }
        dst[i] = Math.trunc(a / srcChannels);
    }

    return dst;
}
