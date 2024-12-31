import { Avatar } from "@mui/material";

export const UserAvatar = (props: {
  name?: string;
  avatarImage?: string;
  className?: string;
  onClick?: () => void;
}) => {
  const { name, avatarImage, className, onClick = () => {} } = props;
  return (
    <Avatar
      alt={name}
      src={avatarImage}
      className={className}
      onClick={onClick}
    >
      {name?.charAt(0).toUpperCase()}
    </Avatar>
  );
};
