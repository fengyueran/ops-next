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
import styled, { css } from 'styled-components';

import { Col, ElasticBox, SpaceY } from 'src/components';
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

// const StyledMenu = styled(Menu)``;

export const Sider = () => {
  return (
    <Container>
      <Logo src={logoImg} />
      <SpaceY size={36} />
      <AppstoreFilled style={{ color: '#1890FF' }} />
      {/* <StyledMenu
        mode="inline"
        inlineCollapsed={true}
        //   style={{ flex: 1 }}
        //   defaultOpenKeys={['due-today', 'task']}
        //   onClick={(e) => onMenuClick(e.key.toString())}
        //   defaultSelectedKeys={selectedKey ? [selectedKey] : []}
        triggerSubMenuAction="click"
      >
        <SubMenu key="due-today" icon={<AppstoreOutlined />} />
      </StyledMenu> */}
      <ElasticBox />
      <Footer isFold>
        <MenuUnfoldOutlined />
      </Footer>
    </Container>
  );
};
