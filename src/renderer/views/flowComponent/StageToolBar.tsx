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
import { AlignHorizontalLeft, NoteAdd } from "@mui/icons-material";
import { Button } from "@mui/material";
import {
  getLayoutParam,
  useVFReactflowStore,
} from "../store/useVFReactflowStore.jsx";
import { useDnD } from "./DnDContext.jsx";

export const StageToolBar = () => {
  const layout = useVFReactflowStore((state) => state.layout);
  return (
    <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
      <div className="flex flex-col rounded border border-white bg-indigo-950 mb-4">
        <ContentsMakerButton />
      </div>
      <div className="flex flex-col rounded border border-white bg-indigo-950">
        <Button
          className="text-white min-w-0"
          onClick={() => {
            layout(getLayoutParam());
          }}
        >
          <AlignHorizontalLeft />
        </Button>
      </div>
    </div>
  );
};

const ContentsMakerButton = () => {
  const [typeState, setType] = useDnD();
  const onDragStart = (event: any, nodeType: string) => {
    setType(nodeType);
    event.dataTransfer.effectAllowed = "move";
  };
  return (
    <Button
      className="text-white min-w-0"
      onDragStart={(event) => onDragStart(event, "input")}
      draggable
    >
      <NoteAdd className="text-white" />
    </Button>
  );
};
