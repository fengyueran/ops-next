import React from 'react';
import {
  //   AppstoreOutlined,
  //   SearchOutlined,
  MenuUnfoldOutlined,
  AppstoreFilled,
  // SettingOutlined,
  // NotificationOutlined,
  // PlusSquareOutlined,
} from '@ant-design/icons';
import { Menu, Dropdown } from 'antd';
import styled, { css } from 'styled-components';
import { FormattedMessage } from 'react-intl';

import { Col, ElasticBox, SpaceY, Avatar } from 'src/components';
import logoImg from 'src/assets/icons/logo.svg';

const Container = styled(Col)`
  height: 100%;
  align-items: center;
  padding: 16px 0;
`;

const Logo = styled.img`
  width: 32px;
  height: 32px;
`;

const LogoutBtn = styled.div`
  cursor: pointer;
`;

const Footer = styled.div<{ isFold: boolean }>`
  ${(p) =>
    p.isFold
      ? css`
          justify-content: center;
          padding: 16px 0 0 0;
        `
      : css`
          padding: 16px 24px 0 24px;
        `}
  display: flex;
  width: 100%;
  align-items: center;
  border-top: 1px solid #f0f0f0;
`;

interface Props {
  logout: () => void;
  username: string;
}

export const Sider: React.FC<Props> = ({ username, logout }) => {
  return (
    <Container>
      <Logo src={logoImg} />
      <SpaceY size={36} />
      <AppstoreFilled style={{ color: '#1890FF' }} />
      <ElasticBox />
      {username && (
        <Dropdown
          trigger={['click']}
          placement="topLeft"
          overlay={
            <Menu
              items={[
                {
                  type: 'group',
                  label: (
                    <LogoutBtn onClick={logout}>
                      <FormattedMessage defaultMessage="退出登录" />
                    </LogoutBtn>
                  ),
                },
              ]}
            />
          }
        >
          <Avatar publicName={username} />
        </Dropdown>
      )}
      <SpaceY size={10} />
      <Footer isFold>
        <MenuUnfoldOutlined />
      </Footer>
    </Container>
  );
};
