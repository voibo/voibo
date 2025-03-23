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

import { createContext, ReactNode, useContext, useState } from "react";

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
};

// Contextの初期値と型を設定
const DnDContext = createContext<DnDContextType | undefined>(undefined);

export const DnDProvider = (props: { children: ReactNode }) => {
  const { children } = props;
  const [type, setType] = useState<string | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null
  );
  const [isDragging, setIsDragging] = useState<boolean>(false);

  return (
    <DnDContext.Provider
      value={{
        type,
        setType,
        position,
        setPosition,
        isDragging,
        setIsDragging,
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
