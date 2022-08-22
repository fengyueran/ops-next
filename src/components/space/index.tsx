import React from 'react';

interface SpaceProps {
  size: number;
}

const SpaceX: React.FC<SpaceProps> = ({ size }) => <div style={{ width: size }} />;

const SpaceY: React.FC<SpaceProps> = ({ size }) => <div style={{ height: size }} />;

export { SpaceX, SpaceY };
