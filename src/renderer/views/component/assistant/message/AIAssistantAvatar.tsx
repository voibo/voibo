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
import { FaceRetouchingNatural } from "@mui/icons-material";
import { Avatar } from "@mui/material";

export const AIAssistantAvatar = ({
  label,
  icon,
  isError = false,
  sx,
  withLabel = false,
}: {
  label?: string;
  icon?: string;
  isError?: boolean;
  sx?: any;
  withLabel?: boolean;
}) => {
  const avatar = (
    <Avatar
      variant="rounded"
      className={`${isError ? "bg-red-500" : "bg-blue-400 text-black/60"}`}
      alt={label}
      src={icon}
      sx={sx}
    >
      {label ? label[0] : <FaceRetouchingNatural />}
    </Avatar>
  );
  return withLabel ? (
    <div className="flex items-center">
      {avatar}
      <div className="ml-2 text-white">{label}</div>
    </div>
  ) : (
    avatar
  );
};
