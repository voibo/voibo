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
import { Transform } from "stream";
import { Format } from "./format.js";
import { SoundLevel } from "./soundLevel.js";
import { concatInt16Arrays } from "./utils.js";

export interface Segment {
  offset: number;
  data: Int16Array;
}

export const isSegment = (v: any): v is Segment =>
  v != undefined &&
  typeof v === "object" &&
  typeof v.offset === "number" &&
  v.data instanceof Int16Array;

export interface SilenceDividerOptions {
  format: Format;
  silenceLevel: number;
  silenceLength: number; // sec 0より大きい値
  maxLength: number;
  minLength: number;
}

const SoundChange = {
  SOUNDING: "SOUNDING",
  START_SOUND: "START_SOUND",
  FALL_SILENT: "FALL_SILENT",
  SILENT: "SILENT",
} as const;
type SoundChange = (typeof SoundChange)[keyof typeof SoundChange];

export class SilenceDivider extends Transform {
  #opts: SilenceDividerOptions;
  #format?: Format;
  #level?: SoundLevel;

  #segmentBuf?: Int16Array; // pushするまでのバッファ
  #segmentOffset: number; // 現在のセグメントの開始位置 from Stream開始
  #silentOffset: number; // 現在の無音の開始位置 from Stream開始
  #offset: number; // 経過位置 from Stream開始

  // config
  #silenceSamples: number; // 無音とみなすサンプル数（秒数をバッファの長さに変換したもの）
  #maxSamples: number; // セグメントの最大サンプル数
  #minSamples: number; // セグメントの最小サンプル数

  get sampleRate(): number {
    return this.#format?.sampleRate ?? 0;
  }

  constructor(opts: SilenceDividerOptions) {
    super({
      objectMode: true,
    });

    this.#opts = opts;
    this.#format = opts.format;
    this.#segmentBuf = undefined;
    this.#segmentOffset = -1;
    this.#silentOffset = 0; // 開始前は無音とみなす
    this.#offset = 0;

    this.#level = new SoundLevel(this.#format.sampleRate);

    // config
    this.#silenceSamples = Math.trunc(
      this.#opts.silenceLength * this.sampleRate
    );
    this.#maxSamples = Math.trunc(this.#opts.maxLength * this.sampleRate);
    this.#minSamples = Math.trunc(this.#opts.minLength * this.sampleRate);
    if (this.#maxSamples < this.#minSamples) {
      const tmp = this.#maxSamples;
      this.#maxSamples = this.#minSamples;
      this.#minSamples = tmp;
    }

    console.log(
      `Constructor:  silenceSamples:${this.#silenceSamples} maxSamples:${
        this.#maxSamples
      } minSamples:${this.#minSamples}`
    );
  }

  /**
   * セグメントがある場合に MinSample を確認
   * MinSample の時間の中では、無音・有音の判断は最後だけ「無音」扱いする
   *
   * @param offsetOfChunk
   * @param chunk
   * @param callback
   * @returns
   */
  __checkMinSample(
    offsetOfChunk: number, // chunk内部の現在位置. 0から始まる
    chunk: Int16Array
  ): number {
    let result = offsetOfChunk;
    const currentOffset = this.#offset + offsetOfChunk; // 処理開始時を基点にしたこれから処理する音声データの位置
    if (
      this.#segmentOffset >= 0 &&
      currentOffset - this.#segmentOffset < this.#minSamples
    ) {
      this.#silentOffset = -1; // 最後を「有音」扱いにする
      const required = this.#minSamples - (currentOffset - this.#segmentOffset); // 上よりrequired >=1 が保証される
      if (chunk.length - offsetOfChunk - 1 < required) {
        // chunkの残り全部でも minSamples が不足する場合には、バッファに積んで次のchunkを待つ
        // このとき offsetOfChunk から先のchunkの残り全部をバッファに積むことがポイント
        const data = chunk.slice(offsetOfChunk, chunk.length);
        this.#segmentBuf = this.#segmentBuf
          ? concatInt16Arrays(this.#segmentBuf, data)
          : data;
        this.#offset += chunk.length; // 次回に向けて音声データ時刻を更新 <= このchunkの分はすべて処理済みなので。
        result = -1; // returnを示すために-1を返す
      } else {
        // このchunkの中で minSamples が完結する場合には、chunkOffsetを最小長まで飛ばして、通常のチャンクの確認に進む
        result = offsetOfChunk + required - 1; // FIXME ここは本当にあってる？？？
      }
    }
    return result;
  }

  /**
   * セグメントをpushする
   * 同時にセグメントオフセットとバッファを初期化する
   * @param offset
   * @param data
   * @param left
   */
  __pushSegment(offset: number, data: Int16Array, left?: Int16Array): void {
    // log
    /*
    console.log(
      `PUSH SEGMENT [${offset}]  data:${data.length} left:${left?.length ?? 0}`
    );
    */
    this.push({
      offset,
      data,
    });
    this.#segmentOffset = -1;
    this.#segmentBuf = left;
  }

  override _transform(
    chunk: any,
    _: BufferEncoding,
    callback: (error?: Error | null) => void
  ) {
    if (!(chunk instanceof Int16Array)) {
      callback(new Error("unsupported input"));
      return;
    }
    if (this.#level == null) {
      callback(new Error("failed to get source format"));
      return;
    }

    let offsetOfChunk = 0;
    let currentOffset = this.#offset + offsetOfChunk; // 処理開始時を基点にしたこれから処理する音声データの位置

    // セグメントが開始され minSamples を満たしていない場合の確認
    offsetOfChunk = this.__checkMinSample(offsetOfChunk, chunk);
    this.debug("INIT:__checkMinSample", offsetOfChunk);
    if (offsetOfChunk < 0) {
      callback();
      return; // 次チャンクに向けてcallbackしている場合
    }

    // チャンクの要素毎に処理
    for (offsetOfChunk; offsetOfChunk < chunk.length; offsetOfChunk++) {
      this.#level.update(normalize(chunk[offsetOfChunk])); // chunk内部の現在位置のdb測定
      currentOffset = this.#offset + offsetOfChunk; // 処理開始時を基点にしたこれから処理する音声データの位置

      // 音圧変化判断　＆　セグメント開始 & minSamples 未満の場合の処理
      let soundChange: SoundChange = SoundChange.SILENT;
      if (this.#level.level > this.#opts.silenceLevel) {
        if (this.#silentOffset >= 0) {
          // 無音 -> 有音
          soundChange = SoundChange.START_SOUND;
          this.#silentOffset = -1; // 無音開始位置を-1に
          this.debug("DETECT_START_SOUND", offsetOfChunk);

          // セグメントの開始位置が未定の場合は、セグメントを開始
          if (this.#segmentOffset < 0) {
            this.#segmentOffset = currentOffset;

            // セグメントが開始され minSamples を満たしていない場合の確認
            this.debug("START_SOUND:__checkMinSample:BF", offsetOfChunk);
            offsetOfChunk = this.__checkMinSample(offsetOfChunk, chunk);
            this.debug("START_SOUND:__checkMinSample:AF", offsetOfChunk);
            if (offsetOfChunk < 0) {
              callback();
              return; // 次チャンクに向けてcallbackしている場合
            }
          }
        } else {
          // 有音 -> 有音
          soundChange = SoundChange.SOUNDING;
        }
      } else {
        if (this.#silentOffset < 0) {
          // 有音 -> 無音
          soundChange = SoundChange.FALL_SILENT;
          this.#silentOffset = currentOffset; // 無音開始位置に現在のオフセットを設定
          this.debug("DETECT_FALL_SILENT", offsetOfChunk);
        } else {
          // 無音 -> 無音
          soundChange = SoundChange.SILENT;
        }
      }

      // セグメントが始まっている場合の判断
      // minSamples は処理済み
      if (this.#segmentOffset >= 0) {
        switch (soundChange) {
          case SoundChange.FALL_SILENT:
          case SoundChange.SILENT:
            // 無音が一定時間続く場合には、セグメントを終了してpushする
            if (currentOffset - this.#silentOffset >= this.#silenceSamples) {
              // 既存のBufferがある場合は、有音側でmaxSamplesを超えたらセグメントを終了してpushするので、こちらでは考慮しない
              let data;
              if (this.#segmentBuf) {
                // this.#segmentBuf の先頭は this.#segmentOffsetと同じ。
                if (this.#silentOffset >= this.#offset) {
                  // silentOffset が chunk に含まれる場合
                  data = concatInt16Arrays(
                    this.#segmentBuf,
                    chunk.slice(0, this.#silentOffset - this.#offset)
                  );
                } else {
                  // silentOffset が segmentBuf に含まれる場合
                  data = this.#segmentBuf.slice(
                    0,
                    this.#silentOffset - this.#segmentOffset
                  );
                }
              } else {
                // このchunk内でセグメントが開始して終了した場合
                data = chunk.slice(
                  this.#segmentOffset - this.#offset,
                  this.#silentOffset - this.#offset
                );
              }
              this.debug("OVER_MIN_SILENT", offsetOfChunk);
              this.__pushSegment(this.#segmentOffset, data);
            }
            break;
          case SoundChange.SOUNDING:
          case SoundChange.START_SOUND:
            // 長すぎる場合には、セグメントを終了してpushする
            if (currentOffset - this.#segmentOffset >= this.#maxSamples) {
              // 最大限の長さを超える場合はpushして、残りはバッファに積む
              const data = this.#segmentBuf
                ? concatInt16Arrays(
                    this.#segmentBuf,
                    chunk.slice(0, offsetOfChunk)
                  )
                : chunk.slice(
                    this.#segmentOffset - this.#offset,
                    offsetOfChunk
                  );
              const left = chunk.slice(offsetOfChunk, chunk.length);
              this.#silentOffset = currentOffset; //重要： 最後を無音扱いにすることで次のChunkで　無音⇒有音　扱いにする
              this.debug("TOO_LONG", offsetOfChunk);
              this.__pushSegment(this.#segmentOffset, data, left);
            }
            break;
        }
      }
    } // chunk の loop end

    // セグメントが存在する場合はBufferに追加
    // minSamples は処理済み
    if (this.#segmentOffset >= 0) {
      // Bufferがある場合には、先頭が無音だろうが積む
      // このchunkの中でセグメントが発生した場合には、セグメント開始からここまでのデータをpushする

      this.#segmentBuf = this.#segmentBuf
        ? concatInt16Arrays(this.#segmentBuf, chunk)
        : chunk.slice(
            this.#segmentOffset - this.#offset, // start
            chunk.length // end
          );
      this.debug("ADD BUFFER");
    }

    // 次回に向けて音声データ時刻を更新 & 次のchunkに向けてcallback
    this.#offset += chunk.length;
    callback();
  }

  override _flush(callback: (error?: Error | null) => void) {
    this.debug("flush");
    if (this.#segmentBuf && this.#segmentOffset >= 0) {
      this.push({
        offset: this.#segmentOffset,
        data:
          this.#silentOffset < 0
            ? this.#segmentBuf // 有音で終わっている場合には、バッファのままpush
            : this.#segmentBuf.slice(
                0,
                this.#silentOffset - this.#segmentOffset
              ), // 無音で終わっている場合には、無音の開始位置までをpush,
      });
    }
    callback();
  }

  debug(label: string, offsetOfChunk?: number): void {
    console.log(
      `[${this.#offset} & ${offsetOfChunk ?? "-"}] ${label}  seg:${
        this.#segmentOffset
      } silent:${this.#silentOffset} buf:${
        this.#segmentBuf?.length ?? "-"
      } level:${this.#level?.level}`
    );
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
