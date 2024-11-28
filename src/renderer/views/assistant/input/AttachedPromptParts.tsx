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
import { AddOutlined, RemoveOutlined } from "@mui/icons-material";
import { ReactNode, useState } from "react";

export const AttachedPromptParts = (props: {
  title: ReactNode;
  content: ReactNode;
}) => {
  const { title, content } = props;
  const [expanded, setExpanded] = useState(false);
  const toggleExpanded = () => setExpanded((current) => !current);

  return (
    <div
      className="cursor-pointer flex flex-col w-full"
      onClick={toggleExpanded}
    >
      <div className="m-2 mt-0 ml-0  text-left items-center flex justify-between flex-row">
        <h5 className="flex-1">{title}</h5>
        <div className="flex-none pl-2">
          {expanded ? (
            <RemoveOutlined sx={{ fontSize: "1rem" }} />
          ) : (
            <AddOutlined sx={{ fontSize: "1rem" }} />
          )}
        </div>
      </div>
      <div
        className={`overflow-auto transition-[max-height] duration-200 ease-in ${
          expanded ? "max-h-full" : "max-h-0"
        }`}
      >
        <div className="text-left text-sm  text-black/50">{content}</div>
      </div>
    </div>
  );
};
