import React from 'react';
import { Avatar as A } from 'antd';
import { nameToColor } from './utils';

interface AvatarProps {
  avatar?: string;
  publicName: string;
}

export const Avatar: React.FC<AvatarProps> = ({ publicName, avatar, ...props }) => {
  const avatarColor = nameToColor(publicName);
  const avatarLabel = publicName[0].toUpperCase();

  return (
    <A
      style={{
        cursor: 'pointer',
        userSelect: 'none',
        color: avatarColor,
        fontSize: 16,
        backgroundColor: `${avatarColor}19`,
      }}
      {...props}
    >
      {avatarLabel}
    </A>
  );
};
