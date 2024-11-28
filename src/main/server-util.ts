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
import { dialog } from "electron";
import * as fs from "fs";
import path from "path";

/**
 * Server side API も含めたUtil
 * Web側で利用してはいけない
 */

// ==== File =====
export type LoadedSelectedFileData = { canceled: boolean; data: Array<string> };

/**
 * 指定フォルダの全フォルダ名を取得する
 * @param folderPath
 * @returns
 */
export function getIncludedFolderNames(folderPath: string): Array<string> {
  return fs
    .readdirSync(folderPath, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
}

/**
 * 指定パスのファイルを読み込む
 * @param filePaths
 * @param encoding
 * @returns
 */
export function loadTextFiles(
  filePaths: Array<string>,
  encoding: BufferEncoding = "utf8"
): Array<string> {
  const fileDataList = filePaths.map((filePath) =>
    fs.readFileSync(filePath, { encoding })
  );
  return fileDataList;
}

/**
 * OSのファイルダイアログを表示して選択したファイルを読み込む
 * @returns
 */
export async function loadDialogSelectedFile(): Promise<LoadedSelectedFileData> {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    filters: [{ name: "Documents", extensions: ["txt"] }],
  });

  if (canceled) {
    return { canceled, data: [] };
  } else {
    return { canceled, data: loadTextFiles(filePaths) };
  }
}

/**
 * OSのファイルダイアログをで指定したファイルパスにテキストファイルを保存する
 * @param text
 * @returns
 */
export async function saveWithOSDialog(text: string): Promise<void> {
  const { canceled, filePath } = await dialog.showSaveDialog({
    filters: [{ name: "Documents", extensions: ["txt"] }],
  });

  if (canceled || !filePath) {
    return;
  } else {
    const writeStream = fs.createWriteStream(filePath);
    writeStream.write(text);
    writeStream.close();
  }
}

/**
 * 指定パスにデータを保存する
 * @param data
 * @returns
 */
export async function save(
  filePath: string,
  data: string | Buffer | Uint8Array,
  writeCallback?: (err: Error | null | undefined) => void,
  closeCallback?: (err: NodeJS.ErrnoException | null | undefined) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(filePath);

    writeStream.on("error", (err) => {
      if (writeCallback) {
        writeCallback(err);
      }
      reject(err);
    });

    writeStream.write(data, (err) => {
      if (writeCallback) {
        writeCallback(err);
      }
      if (err) {
        reject(err);
      } else {
        writeStream.close((closeErr) => {
          if (closeCallback) {
            closeCallback(closeErr);
          }
          if (closeErr) {
            reject(closeErr);
          } else {
            resolve();
          }
        });
      }
    });
  });
  /*
  const writeStream = fs.createWriteStream(filePath);
  writeStream.write(data, writeCallback);
  writeStream.close(closeCallback);
  */
}

/**
 * 指定パスにディレクトリを作成する
 * 既に存在する場合は何もしない
 *
 * @param dirPath
 * @param recursive
 */
export function makeDir(dirPath: string, recursive: boolean = false): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: recursive });
  }
}

/**
 * 指定フォルダ内のファイルを再帰的に検索する
 *
 * @param dir
 * @param pattern
 * @returns
 */
export function findFiles(dir: string, pattern: RegExp): Array<string> {
  const files = fs.readdirSync(dir);
  const results: Array<string> = [];
  for (const file of files) {
    const targetPath = path.join(dir, file);
    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      results.push(...findFiles(targetPath, pattern));
    } else if (stat.isFile() && pattern.test(file)) {
      results.push(targetPath);
    }
  }
  return results;
}

/**
 * 指定フォルダを再帰的に削除する
 * @param dirPath
 */
export function deleteFolder(dirPath: string): void {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach((file) => {
      const curPath = path.join(dirPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolder(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(dirPath);
  }
}

/**
 * 指定ファイルが存在するかどうか
 * @param targetPath
 * @returns
 */
export function isExited(targetPath: string): boolean {
  return fs.existsSync(targetPath);
}
