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
import { ZoomIn, ZoomOut } from "@mui/icons-material";
import { Button } from "@mui/material";
import { MiniMap, useReactFlow, useViewport } from "@xyflow/react";

const StageTransitionOption = { duration: 100 }; // duration を入れると、then が効かなくなるので、使い方に注意

export type ChangeViewMode =
  | "topicStart"
  | "topicEnd"
  | "zoomIn"
  | "zoomOut"
  | "fit";

export const CustomMiniMap = () => {
  const reactFlow = useReactFlow();
  const { zoom } = useViewport();

  return (
    <div className="flex flex-col items-center border border-white bg-indigo-950 rounded">
      <MiniMap
        pannable={true}
        zoomable={true}
        className="relative bg-indigo-950 m-0 p-0"
      />
      <div className="w-full flex items-center justify-between">
        <Button
          className="text-white grow-0"
          onClick={() => {
            reactFlow.zoomOut(StageTransitionOption);
          }}
        >
          <ZoomOut />
        </Button>
        <div className="text-white grow-0 flex items-center justify-center">
          <div>{Math.floor(zoom * 100)}%</div>
        </div>
        <Button
          className="text-white grow-0"
          onClick={() => {
            reactFlow.zoomIn(StageTransitionOption);
          }}
        >
          <ZoomIn />
        </Button>
      </div>
    </div>
  );
};
