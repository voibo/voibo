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
import { textChunk } from '../util.js';

export class MinutesAnalyzer {
    /**
     * 議事録を分割する
     *
     * 議事録の一文が一人の１会話
     * 1会話で limit を超過する場合には、強制的に分割する必要がある。
     *  ⇒　この場合には、句点を基準に分割する必要がある。
     *
     * @param minutesDoc 議事録文字列
     * @param tokenLimit 制限「文字数」
     */
    static splitMinutes(
        minutesDoc: string,
        tokenLimit: number = 1500
    ): Array<string> {
        const minutes = minutesDoc.split('\n');
        let chunk: Array<string> = [];
        let current_chunk: string = '';
        // get records
        minutes.forEach((comment) => {
            if (tokenLimit > current_chunk.length + comment.length) {
                // in limit
                current_chunk += comment + '\n';
            } else {
                // limit over
                // flush last chunk
                if (current_chunk.length > 0) {
                    chunk.push(current_chunk);
                }
                // process current comment
                if (comment.length <= tokenLimit) {
                    current_chunk = comment + '\n';
                } else {
                    // 1 comment が limit を超過する場合には強制的に分割
                    const data = MinutesAnalyzer.__split_limit_over_comment(
                        comment,
                        tokenLimit
                    );
                    current_chunk = data[0] + '\n';
                    chunk = chunk.concat(data[1]);
                }
            }
        });
        if (current_chunk.length > 0) {
            chunk.push(current_chunk);
            current_chunk = '';
        }
        return chunk;
    }

    /**
     * 1コメントが長くてlimitを超えている場合の処理
     * 句点「。」で分割。
     * 分割した結果はさらに、limit で強制的に分割
     * @param comment
     * @param tokenLimit
     * @returns
     */
    private static __split_limit_over_comment(
        comment: string,
        tokenLimit: number = 2000
    ): [string, Array<string>] {
        let chunk: Array<string> = [];
        let current_chunk: string = '';

        // この場合には先頭にある [ start msec -> end msec @ speaker ] の部分を取り出す
        const regex = /\[\d+ -> \d+ @ .*\] /;
        const speaker = comment.match(regex)?.[0] ?? '';

        const splitted_comments = comment.replace(regex, '').split('。');
        console.log('__split_limit_over_comment', speaker);

        splitted_comments.forEach((comment_elem, index) => {
            if (index < splitted_comments.length - 1) {
                comment_elem += '。';
            }
            if (tokenLimit > current_chunk.length + comment_elem.length) {
                // in limit
                current_chunk += comment_elem;
            } else {
                // limit over
                // flush last chunk
                if (current_chunk.length > 0) {
                    chunk.push(speaker + current_chunk);
                }
                // process current comment
                if (comment_elem.length <= tokenLimit) {
                    current_chunk = comment_elem;
                } else {
                    // 1 comment が limit を超過する場合には数で強制的に分割
                    const data = textChunk(comment_elem, tokenLimit);
                    if (data[-1].length == tokenLimit) {
                        //ちょうど割り切れた
                        current_chunk = '';
                    } else {
                        current_chunk = data.pop() ?? ''; // 割り切れない場合は最後
                    }
                    chunk = chunk.concat(data);
                }
            }
        });

        if (current_chunk.length > 0) {
            chunk.push(speaker + current_chunk);
            current_chunk = '';
        }
        return [current_chunk, chunk];
    }
}
