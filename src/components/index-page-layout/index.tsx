import React from 'react';
import styled from 'styled-components';
import { Layout } from 'antd';

const StyledLayout = styled(Layout)`
  width: 100%;
  height: 100%;
`;

const StyledSider = styled(Layout.Sider)`
  background: blue;
`;

const StyledHeader = styled(Layout.Header)`
  background: green;
`;

const StyledContent = styled(Layout.Content)`
  padding: 0 25px 25px 25px;
`;

interface Props {
  sider: React.ReactNode;
  header: React.ReactNode;
  content: React.ReactNode;
}
export const IndexPageLayout: React.FC<Props> = ({ sider, header, content }) => (
  <StyledLayout>
    <StyledSider>{sider}</StyledSider>
    <Layout>
      <StyledHeader>{header}</StyledHeader>
      <StyledContent>{content}</StyledContent>
    </Layout>
  </StyledLayout>
);
