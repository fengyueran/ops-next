import React from 'react';

interface Props {
  onClick: () => void;
}

export const OpenToolBtn: React.FC<Props> = ({ onClick }) => {
  return <button onClick={onClick}>Open QC Tool</button>;
};
