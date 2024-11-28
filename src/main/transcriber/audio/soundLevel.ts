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
const windowSize = 100; // milliseconds

function calcWindowLength(sampleRate: number): number {
    return Math.trunc((sampleRate * windowSize) / 1000);
}

// SoundLevel は音圧を計測します。
export class SoundLevel {
    #sampleRate: number;
    #sum: KahanSummation;
    #window: number[];
    #offset: number;

    // サンプリングレート。
    get sampleRate(): number {
        return this.#sampleRate;
    }

    // コンストラクター。
    //
    // @param sampleRate - 音声のサンプリングレート。
    constructor(sampleRate: number) {
        this.#sampleRate = sampleRate;
        this.#sum = new KahanSummation();
        this.#window = Array<number>(calcWindowLength(sampleRate));
        this.#window.fill(0);
        this.#offset = 0;
    }

    // 時間窓の波形データを更新します。
    // 時間窓内の最も古い振幅値を新しい振幅値で置き換えます。
    //
    // @param a - 更新する振幅値。
    update(a: number) {
        const oldVal = this.#window[this.#offset];
        const newVal = a * a;
        this.#window[this.#offset] = newVal;

        this.#sum.add(-oldVal);
        this.#sum.add(newVal);

        this.#offset = (this.#offset + 1) % this.#window.length;
    }

    // 現在の音圧レベル (dB) を取得します。
    get level(): number {
        // 浮動小数点数の加減算は誤差が生じる。
        // この誤差は無視できる程に小さい値であるが、
        // 誤差を減らすためにカハンの加算アルゴリズムを用いる。
        let sum = this.#sum.sum;
        if (sum < 0) {
            // 誤差により合計値が負数になることがある。
            // 負数の平方根は虚数になるため、絶対値を使用する。
            sum = -sum;
        }
        // RMS (二乗平均平方根)
        const rms = Math.sqrt(sum / this.#window.length);

        // RMS 値が非常に小さい場合（事実上ゼロに等しい場合）、-100 dB を返すことで、Math.log10() の結果が 無限 になるのを防ぐ。
        if (rms <= 1e-10) {
            return -100;
        }

        // 基準値 (1.0) に対する RMS のデシベル値を音圧とする
        return 20.0 * Math.log10(rms / 1.0);
    }
}

class KahanSummation {
    #c: number;
    #sum: number;

    constructor() {
        this.#c = 0;
        this.#sum = 0;
    }

    add(x: number) {
        const y = x - this.#c;
        const t = this.#sum + y;
        this.#c = t - this.#sum - y;
        this.#sum = t;
    }

    get sum(): number {
        return this.#sum;
    }
}
