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
import { useRef } from "react";

// useClickHandler: シングルクリックとダブルクリックの処理を区別するカスタムフック
type ClickHandler = () => void;

const useClickHandler = ({
  onSingleClick,
  onDoubleClick,
  delay = 250,
}: {
  onSingleClick?: ClickHandler;
  onDoubleClick?: ClickHandler;
  delay?: number; // デフォルト遅延時間 (ms)
}): ClickHandler => {
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleClick = () => {
    if (clickTimeoutRef.current) {
      // ダブルクリック時はシングルクリックのタイマーをクリア
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      onDoubleClick && onDoubleClick(); // ダブルクリック処理を実行
    } else {
      // シングルクリックと判定するために遅延を設定
      clickTimeoutRef.current = setTimeout(() => {
        onSingleClick && onSingleClick(); // シングルクリック処理を実行
        clickTimeoutRef.current = null;
      }, delay);
    }
  };

  return handleClick;
};

export default useClickHandler;
