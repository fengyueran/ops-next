import React from 'react';

interface Props {
  onClick: () => void;
}

export const CloseMicroAppBtn: React.FC<Props> = ({ onClick }) => {
  return <button onClick={onClick}>Close</button>;
};
