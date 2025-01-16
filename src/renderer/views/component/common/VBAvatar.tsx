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
import { Avatar } from "@mui/material";

import { AvatarProps } from "@mui/material";

export const VBAvatar = (props: {
  name?: string;
  avatarImage?: string;
  className?: AvatarProps["className"];
  onClick?: AvatarProps["onClick"];
  variant?: AvatarProps["variant"];
}) => {
  const { name, avatarImage, className, onClick = () => {}, variant } = props;
  return (
    <Avatar
      alt={name}
      src={avatarImage}
      className={className}
      onClick={onClick}
      variant={variant}
    >
      {name?.charAt(0).toUpperCase()}
    </Avatar>
  );
};
