import React from 'react';
import styled from 'styled-components';
import { Layout } from 'antd';

const StyledLayout = styled(Layout)`
  width: 100%;
  height: 100%;
  background: #f6f6f6 !important;
`;

const StyledSider = styled(Layout.Sider)`
  background: #ffffff !important;
  box-shadow: 5px 0 12px 4px rgba(0, 0, 0, 0.09), 3px 0 6px 0 rgba(0, 0, 0, 0.12), 1px 0 2px -2px;
`;

const StyledHeader = styled(Layout.Header)`
  background: #f6f6f6 !important;
  padding-left: 26px;
`;

const StyledContent = styled(Layout.Content)`
  padding: 0 25px 25px 25px;
  background: #f6f6f6 !important;
`;

interface Props {
  sider: React.ReactNode;
  header: React.ReactNode;
  content: React.ReactNode;
}
export const IndexPageLayout: React.FC<Props> = ({ sider, header, content }) => (
  <StyledLayout>
    <StyledSider width={64}>{sider}</StyledSider>
    <Layout>
      <StyledHeader>{header}</StyledHeader>
      <StyledContent>{content}</StyledContent>
    </Layout>
  </StyledLayout>
);
