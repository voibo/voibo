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
 * https://reactflow.dev/examples/interaction/drag-and-drop
 */

import {
  createContext,
  ReactNode,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";

// カスタマイズ可能なコールバックの型定義
type DragStartCallback = (type: string) => void;
type DragEndCallback = (
  type: string,
  position: { x: number; y: number } | null
) => void;

type CallbacksType = {
  onDragStart?: DragStartCallback;
  onDragEnd?: DragEndCallback;
};

// 拡張された型定義
type DnDContextType = {
  type: string | null;
  setType: React.Dispatch<React.SetStateAction<string | null>>;
  position: { x: number; y: number } | null;
  setPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number } | null>
  >;
  isDragging: boolean;
  setIsDragging: React.Dispatch<React.SetStateAction<boolean>>;
  // 新しいメソッド
  startDrag: (nodeType: string) => void;
  endDrag: () => void;
  // コールバック設定メソッド
  setDragCallbacks: (callbacks: Partial<CallbacksType>) => void;
};

const DnDContext = createContext<DnDContextType | undefined>(undefined);

export const DnDProvider = (props: { children: ReactNode }) => {
  const { children } = props;
  const [type, setType] = useState<string | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null
  );
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [callbacks, setCallbacks] = useState<CallbacksType>({
    onDragStart: undefined,
    onDragEnd: undefined,
  });

  // グローバルイベントハンドラ
  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging && type) {
        setPosition({ x: e.clientX, y: e.clientY });
      }
    },
    [isDragging, type]
  );

  const onMouseUp = useCallback(
    (e: MouseEvent) => {
      if (isDragging && type) {
        // コールバックの実行
        if (callbacks.onDragEnd) {
          callbacks.onDragEnd(type, position);
        }

        // 状態のリセット
        setType(null);
        setIsDragging(false);
        setPosition(null);
        document.body.style.cursor = "default";
      }
    },
    [isDragging, type, position, callbacks]
  );

  // ドラッグ開始メソッド
  const startDrag = useCallback(
    (nodeType: string) => {
      setType(nodeType);
      setIsDragging(true);
      document.body.style.cursor = "grabbing";

      if (callbacks.onDragStart) {
        callbacks.onDragStart(nodeType);
      }
    },
    [callbacks]
  );

  // ドラッグ終了メソッド
  const endDrag = useCallback(() => {
    if (isDragging && type && callbacks.onDragEnd) {
      callbacks.onDragEnd(type, position);
    }

    setType(null);
    setIsDragging(false);
    setPosition(null);
    document.body.style.cursor = "default";
  }, [isDragging, type, position, callbacks]);

  // コールバック設定メソッド
  const setDragCallbacks = useCallback(
    (newCallbacks: Partial<CallbacksType>) => {
      setCallbacks((prev) => ({ ...prev, ...newCallbacks }));
    },
    []
  );

  // グローバルイベントの登録/解除
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    } else {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging, onMouseMove, onMouseUp]);

  return (
    <DnDContext.Provider
      value={{
        type,
        setType,
        position,
        setPosition,
        isDragging,
        setIsDragging,
        startDrag,
        endDrag,
        setDragCallbacks,
      }}
    >
      {children}
    </DnDContext.Provider>
  );
};

// カスタムフックの更新
export const useDnD = (): DnDContextType => {
  const context = useContext(DnDContext);
  if (context === undefined) {
    throw new Error("useDnD must be used within a DnDProvider");
  }
  return context;
};

export default DnDContext;
