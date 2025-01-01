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
