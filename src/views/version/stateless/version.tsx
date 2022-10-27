import React from 'react';
import styled from 'styled-components';
import { FormattedMessage } from 'react-intl';
import versionImg from 'src/assets/icons/version.svg';

const Container = styled.div`
  position: absolute;
  top: 18px;
  right: 24px;
  display: flex;
  opacity: 0.65;
  font-family: PingFangSC-Regular;
  font-size: 14px;
  color: #000000;
  font-weight: 400;
  align-items: center;
`;

const VersionImg = styled.img`
  margin-right: 4px;
  width: 16px;
  height: 16px;
`;

interface Props {
  version: string;
}

export const Version: React.FC<Props> = ({ version }) => {
  return (
    <Container>
      <VersionImg src={versionImg} />
      <FormattedMessage defaultMessage="版本" />
      {version}
    </Container>
  );
};
