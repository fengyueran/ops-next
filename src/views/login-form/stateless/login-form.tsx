import React from 'react';
import { Button, Checkbox, Form, Input } from 'antd';
import styled from 'styled-components';
import { FormattedMessage } from 'react-intl';

const SubmitBtn = styled(Button)`
  width: 360px;
`;

interface Props {
  pending: boolean;
  initialValues: { username?: string; password?: string; remember?: boolean };
  onLogin: (values: { username: string; password: string; remember: boolean }) => void;
}

export const LoginForm: React.FC<Props> = ({ initialValues, onLogin, pending }) => {
  return (
    <Form
      name="normal_login"
      className="login-form"
      initialValues={initialValues}
      onFinish={onLogin}
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
        <Input.Password placeholder="Password" />
      </Form.Item>
      <Form.Item>
        <Form.Item name="remember" valuePropName="checked" noStyle>
          <Checkbox>
            <FormattedMessage defaultMessage="记住我" />
          </Checkbox>
        </Form.Item>
      </Form.Item>
      <Form.Item>
        <SubmitBtn type="primary" htmlType="submit" className="login-form-button" loading={pending}>
          <FormattedMessage defaultMessage="登录" />
        </SubmitBtn>
      </Form.Item>
    </Form>
  );
};
