import React, { useCallback } from 'react';
import styled from 'styled-components';
import { FormattedMessage } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { Button, Checkbox, Form, Input, message } from 'antd';

import { Col, Row, SpaceY } from 'src/components';
import { login } from 'src/api';
import { RoutesMap } from 'src/routes';
import logoImg from 'src/assets/icons/logo.svg';

const Container = styled(Row)`
  width: 100vw;
  height: 100vh;
  justify-content: center;
`;

const LogoContainer = styled(Col)`
  align-items: center;
`;

const Logo = styled.img`
  width: 36px;
  height: 36px;
  margin-right: 18px;
`;

const AppName = styled.div`
  opacity: 0.85;
  font-family: PingFangSC-Medium;
  font-size: 32px;
  color: #000000;
  line-height: 40px;
  font-weight: 500;
`;

const Slogan = styled.div`
  opacity: 0.3;
  font-family: PingFangSC-Regular;
  font-size: 14px;
  color: #000000;
  line-height: 22px;
  font-weight: 400;
  margin: 12px 0 32px 0;
`;

const LoginContainer = styled.div`
  width: 360px;
`;

const SubmitBtn = styled(Button)`
  width: 360px;
`;

const StatementContainer = styled(Row)`
  margin-top: 2px;
  font-family: PingFangSC-Regular;
  font-size: 14px;
  color: #000000;
  line-height: 22px;
  font-weight: 400;
  justify-content: center;
`;

const StatementText = styled.div`
  opacity: 0.45;
  color: #000000;
`;

const StatementLink = styled.a`
  color: #1890ff;
`;

export const LoginPage = () => {
  const navigate = useNavigate();

  const onFinish = useCallback(
    async (values: { username: string; password: string; remember: boolean }) => {
      const { username, password } = values;

      try {
        await login(username, password);
        navigate(RoutesMap.CASE_LIST);
      } catch (error) {
        message.error(`Login error: ${(error as Error).message}`);
      }
    },
    [navigate],
  );

  return (
    <Container>
      <Col>
        <SpaceY size={72} />
        <LogoContainer>
          <Row>
            <Logo src={logoImg} />
            <AppName>
              <FormattedMessage defaultMessage="OPS" />
            </AppName>
          </Row>
          <Slogan>
            <FormattedMessage defaultMessage="人工智能助力智慧医疗" />
          </Slogan>
        </LogoContainer>
        <LoginContainer>
          <Form
            name="normal_login"
            className="login-form"
            initialValues={{ remember: true }}
            onFinish={onFinish}
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: 'Please input your Username!' }]}
            >
              <Input placeholder="Username" />
            </Form.Item>
            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Please input your Password!' }]}
            >
              <Input.Password />
            </Form.Item>
            <Form.Item>
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox>
                  <FormattedMessage defaultMessage="记住我" />
                </Checkbox>
              </Form.Item>
            </Form.Item>
            <Form.Item>
              <SubmitBtn type="primary" htmlType="submit" className="login-form-button">
                <FormattedMessage defaultMessage="登录" />
              </SubmitBtn>
            </Form.Item>
          </Form>
        </LoginContainer>
        <StatementContainer>
          <StatementText>
            <FormattedMessage defaultMessage="点击登录，则表示您同意我们的" />
          </StatementText>
          <StatementLink>
            <FormattedMessage defaultMessage="隐私、服务条款。" />
          </StatementLink>
        </StatementContainer>
      </Col>
    </Container>
  );
};
