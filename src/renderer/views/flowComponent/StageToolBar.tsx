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
import { AlignHorizontalLeft, NoteAdd } from "@mui/icons-material";
import { Button, Tooltip } from "@mui/material";
import {
  getLayoutParam,
  useVBReactflowStore,
} from "../store/flow/useVBReactflowStore.jsx";
import { useDnD } from "./DnDContext.jsx";

export const StageToolBar = () => {
  const layout = useVBReactflowStore((state) => state.layout);
  return (
    <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
      <div className="flex flex-col rounded border border-white bg-indigo-950 mb-4">
        <ContentsMakerButton />
      </div>
      <div className="flex flex-col rounded border border-white bg-indigo-950">
        <LayoutButton />
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
    <Tooltip title="Drag to create new content" placement="right">
      <Button
        className="text-white min-w-0"
        onDragStart={(event) => onDragStart(event, "input")}
        draggable
      >
        <NoteAdd className="text-white" />
      </Button>
    </Tooltip>
  );
};

const LayoutButton = () => {
  const layout = useVBReactflowStore((state) => state.layout);
  return (
    <Tooltip title="Layout automatically" placement="right">
      <Button
        className="text-white min-w-0"
        onClick={() => {
          layout(getLayoutParam());
        }}
      >
        <AlignHorizontalLeft />
      </Button>
    </Tooltip>
  );
};
