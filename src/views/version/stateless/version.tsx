import React from 'react';
import styled from 'styled-components';
import { FormattedMessage } from 'react-intl';
import versionImg from 'src/assets/icons/version.svg';

const Container = styled.div`
  position: absolute;
  top: 10px;
  right: 12px;
  display: flex;
`;

const VersionImg = styled.img`
  margin-right: 2px;
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
