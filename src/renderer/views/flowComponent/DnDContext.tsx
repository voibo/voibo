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
/**
 * https://reactflow.dev/examples/interaction/drag-and-drop
 */

import { createContext, ReactNode, useContext, useState } from "react";

// 型定義
type DnDContextType = [
  string | null,
  React.Dispatch<React.SetStateAction<string | null>>
];

// Context の初期値と型を設定
const DnDContext = createContext<DnDContextType | undefined>(undefined);
export const DnDProvider = (props: { children: ReactNode }) => {
  const { children } = props;
  const [type, setType] = useState<string | null>(null);
  return (
    <DnDContext.Provider value={[type, setType]}>
      {children}
    </DnDContext.Provider>
  );
};

// Context を安全に使用するためのカスタムフック
export const useDnD = (): DnDContextType => {
  const context = useContext(DnDContext);
  if (context === undefined) {
    throw new Error("useDnD must be used within a DnDProvider");
  }
  return context;
};

export default DnDContext;
