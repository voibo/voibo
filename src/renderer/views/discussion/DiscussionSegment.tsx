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
import { Segment } from "../../../common/Segment.js";

export type DiscussionSegment = {
  timestamp: string | number;
  texts: {
    timestamp: string | number;
    audioSrc: string;
    audioOffset: number;
    length: number;
    text: string;
  }[];
  // segment attribute
  speaker?: string;
  topicStartedPoint?: boolean;
};

// == MinutesSegment の操作系 ==
export function changeTopicStartedPoint(
  minutes: DiscussionSegment[],
  targetSegmentIndex: number
): DiscussionSegment[] {
  const result: DiscussionSegment[] = JSON.parse(JSON.stringify(minutes));
  if (result[targetSegmentIndex]) {
    result[targetSegmentIndex].topicStartedPoint =
      !result[targetSegmentIndex].topicStartedPoint;
  }
  return result;
}

// == MinutesSegmentText の操作系 ==
export function updateMinutesText(
  minutes: DiscussionSegment[],
  targetSegmentIndex: number,
  targetSegmentTextIndex: number,
  updatedContent: string
): DiscussionSegment[] {
  const result: DiscussionSegment[] = JSON.parse(JSON.stringify(minutes));
  if (
    result[targetSegmentIndex] &&
    result[targetSegmentIndex].texts[targetSegmentTextIndex]
  ) {
    result[targetSegmentIndex].texts[targetSegmentTextIndex].text =
      updatedContent;
  }
  return result;
}

export function removeMinutesText(
  minutes: DiscussionSegment[],
  targetSegmentIndex: number,
  targetSegmentTextIndex: number
): DiscussionSegment[] {
  const result: DiscussionSegment[] = JSON.parse(JSON.stringify(minutes));
  if (
    result[targetSegmentIndex] &&
    result[targetSegmentIndex].texts[targetSegmentTextIndex]
  ) {
    result[targetSegmentIndex].texts.splice(targetSegmentTextIndex, 1);
    // texts が 1つもなくなった場合は segment も削除する
    if (result[targetSegmentIndex].texts.length == 0) {
      result.splice(targetSegmentIndex, 1);
    }
  }
  return result;
}

export function splitMinutesText(
  minutes: DiscussionSegment[],
  targetSegmentIndex: number,
  targetSegmentTextIndex: number
): DiscussionSegment[] {
  const result: DiscussionSegment[] = JSON.parse(JSON.stringify(minutes));
  if (
    result[targetSegmentIndex] &&
    result[targetSegmentIndex].texts[targetSegmentTextIndex] &&
    targetSegmentTextIndex > 0
  ) {
    // texts を 該当textを含めて分割し、新しい segment を作成して直後に追加する
    const targetSegment = result[targetSegmentIndex];
    const targetText = targetSegment.texts[targetSegmentTextIndex];
    const newSegment: DiscussionSegment = {
      timestamp: targetText.timestamp,
      texts: targetSegment.texts.slice(targetSegmentTextIndex),
      speaker: targetSegment.speaker,
    };
    result.splice(targetSegmentIndex + 1, 0, newSegment);

    // 既存の segment は分割された分を残す
    result[targetSegmentIndex].texts = targetSegment.texts.slice(
      0,
      targetSegmentTextIndex
    );
  }
  return result;
}

export function mergeUpMinutesText(
  minutes: DiscussionSegment[],
  targetSegmentIndex: number,
  targetSegmentTextIndex: number
): DiscussionSegment[] {
  const result: DiscussionSegment[] = JSON.parse(JSON.stringify(minutes));
  if (
    result[targetSegmentIndex] &&
    result[targetSegmentIndex].texts[targetSegmentTextIndex]
  ) {
    // texts を 該当textを含めて分割し、当該textを含む部分は前の segment に追加し、残りを既存の segment に残す。
    const targetSegment = result[targetSegmentIndex];
    if (targetSegmentIndex > 0) {
      const prevSegment = result[targetSegmentIndex - 1];
      prevSegment.texts = prevSegment.texts.concat(
        targetSegment.texts.slice(0, targetSegmentTextIndex + 1)
      );
      result[targetSegmentIndex - 1] = prevSegment;

      // 既存の segment は分割された分を残す
      result[targetSegmentIndex].texts = targetSegment.texts.slice(
        targetSegmentTextIndex + 1
      );
      if (result[targetSegmentIndex].texts.length > 0) {
        // 既存の segment が残る場合は、timestamp を更新する
        result[targetSegmentIndex].timestamp =
          result[targetSegmentIndex].texts[0].timestamp;
      } else {
        // 既存の segment がなくなる場合は、segment を削除する
        console.log("mergeUpMinutesText: remove segment");
        result.splice(targetSegmentIndex, 1);
      }
    } else {
      // splitMinutesText と同じなので受け付けない
    }
  }
  return result;
}

/**
 * OpenAI API から取得した Segment を DiscussionSegment に変換して追加する
 * @param newSegments
 * @param minutes
 * @param limitSec
 * @param autoSplitDuration
 * @returns
 */
export function appendMinutesList(
  newSegments: Segment[],
  minutes: DiscussionSegment[],
  limitSec: number = 5
): DiscussionSegment[] {
  let result: DiscussionSegment[] = [...minutes];
  newSegments.map((newSegment) => {
    result = _appendMinutes(newSegment, result, limitSec);
  });
  return result;
}

function _appendMinutes(
  newSegment: Segment,
  minutes: DiscussionSegment[],
  limitSec: number
): DiscussionSegment[] {
  //console.log("_appendMinutes: 0", minutes);
  let result: DiscussionSegment[] = minutes;
  if (newSegment.timestamp != undefined && newSegment.texts != undefined) {
    result = [...minutes];
    const audioSrc = `${newSegment.timestamp}.wav`;
    const target: DiscussionSegment = {
      timestamp: newSegment.timestamp ?? 0,
      texts: newSegment.texts.map((text) => {
        return {
          timestamp: text.timestamp ?? 0,
          audioSrc: audioSrc,
          audioOffset:
            (Number(text.timestamp) ?? 0) - (Number(newSegment.timestamp) ?? 0),
          length: Number(text.length) ?? 0,
          text: text.text ?? "",
        };
      }),
    };

    if (result.length > 0) {
      const lastSegment = result[result.length - 1];
      const lastText = lastSegment.texts[lastSegment.texts.length - 1];
      const lastTextTimestamp = Number(lastText.timestamp);
      const lastTextLength = Number(lastText.length);
      const lastTextLengthSec = lastTextLength / 1000; // msec => sec

      const targetText = target.texts[0];
      const targetTextTimestamp = Number(targetText.timestamp);

      let lastNeedToEscape = false;
      let currentNeedToEscape = false;
      let lastSegmentEnded = false;
      if (/^\.{3}$/.test(targetText.text) || /^\.{1}$/.test(targetText.text)) {
        currentNeedToEscape = true;
      }
      if (/^\.{3}$/.test(lastText.text) || /^\.{1}$/.test(lastText.text)) {
        lastNeedToEscape = true;
      }

      if (/[。！？\!\?]$/.test(lastText.text)) {
        // 前セグメント：　終了記号（読点・感嘆符）で終わっている場合
        lastSegmentEnded = true;
      } else if (/[、]$/.test(lastText.text)) {
        // 前セグメント：　読点で終わっている場合
        lastSegmentEnded = false;
      } else if (currentNeedToEscape) {
        // 現セグメント：　特殊文字である場合　⇒　前が特殊文字でなければ強制的に前に終端記号をつける
        lastSegmentEnded = true;
        if (!lastNeedToEscape) {
          lastText.text += "。";
        }
      } else if (!lastNeedToEscape) {
        // 前セグメント：　終端記号がない　&&　現セグメント：　特殊文字ではない
        // ⇐　特殊文字に接続しないようにするするため
        if (
          lastTextTimestamp + lastTextLengthSec + limitSec >=
          targetTextTimestamp
        ) {
          // 一定時間の中で継続している場合
          lastSegmentEnded = false;
          lastText.text += "、";
        } else {
          lastSegmentEnded = true;
          lastText.text += "。";
        }
      }

      if (currentNeedToEscape || lastNeedToEscape || lastSegmentEnded) {
        result.push(..._splitEndedTextsToSegment(target));
      } else {
        lastSegment.texts.push(...target.texts);
        result.push(..._splitEndedTextsToSegment(result.pop()!)); // lastSegment があるので
      }
    } else {
      result.push(..._splitEndedTextsToSegment(target));
    }
  }
  //console.log("_appendMinutes", result);
  return result;
}

/**
 * 句点で終わっている text を MinuteSegment に分割する
 * @param target
 * @returns
 */
function _splitEndedTextsToSegment(
  target: DiscussionSegment
): DiscussionSegment[] {
  const endedTextsIndexes: number[] = [];
  target.texts.map((text, index) => {
    if (/[。！？\!\?]$/.test(text.text)) {
      endedTextsIndexes.push(index);
    }
  });

  if (endedTextsIndexes.length === 0) {
    return [target];
  } else {
    const result: DiscussionSegment[] = [];
    let lastEnd = 0;
    for (let i = 0; i < endedTextsIndexes.length; i++) {
      const currentEnd = endedTextsIndexes[i];
      result.push({
        ...target,
        timestamp: target.texts[currentEnd].timestamp,
        texts: target.texts.slice(lastEnd, currentEnd + 1),
      });
      lastEnd = currentEnd + 1;
    }
    return result;
  }
}
