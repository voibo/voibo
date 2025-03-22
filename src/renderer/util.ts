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
/**
 * 文字列を指定した長さで分割する。
 * @param text
 * @param size
 * @returns
 */
export function textChunk(text: string, size: number): string[] {
  if (size <= 0) return [];
  const result = [];
  for (let i = 0, j = text.length; i < j; i += size) {
    result.push(text.slice(i, i + size));
  }
  return result;
}

/**
 * Text を maxLength で切り詰め、長すぎる場合には末尾に "..." を付加する。
 * @param text
 * @param maxLength
 * @returns
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + "...";
}

/**
 * timestamp を YYYY/MM/DD HH:MM:SS 形式に変換する。
 * @param timestamp timestamp
 */
export function formatTimestamp(timestamp: number | null): string {
  // timestamp を YYYY/MM/DD HH:MM:SS 形式の文字列に変換する。
  if (!timestamp) return "--/--/-- --:--:--";
  const target = new Date(timestamp);
  const month = String(target.getMonth() + 1).padStart(2, "0");
  const date = String(target.getDate()).padStart(2, "0");
  const hours = String(target.getHours()).padStart(2, "0");
  const minutes = String(target.getMinutes()).padStart(2, "0");
  const seconds = String(target.getSeconds()).padStart(2, "0");
  return `${target.getFullYear()}/${month}/${date} ${hours}:${minutes}:${seconds}`;
}

/**
 * 秒数を HH:MM:SS.NNN 形式に変換する。
 * @param seconds 秒数
 * @param decimalPlaces 小数点以下の桁数 (デフォルトは 0)
 * @returns
 */
export function secondsToHMS(
  seconds: number,
  decimalPlaces: number = 0
): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const paddedHours = String(hours).padStart(2, "0");
  const paddedMinutes = String(minutes).padStart(2, "0");

  // 小数点以下を指定の桁数にフォーマット
  const formattedSeconds = secs
    .toFixed(decimalPlaces)
    .padStart(2 + (decimalPlaces > 0 ? decimalPlaces + 1 : 0), "0");

  return `${paddedHours}:${paddedMinutes}:${formattedSeconds}`;
}

/**
 * 指定した時間だけ待機する。
 * @param milliseconds
 * @returns
 */
export function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
