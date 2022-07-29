import React from 'react';

interface Props {
  toolName: string;
  onClick: () => void;
}

export const OpenToolBtn: React.FC<Props> = ({ toolName, onClick }) => {
  return <button onClick={onClick}>{`Open ${toolName} Tool`}</button>;
};
