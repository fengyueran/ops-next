import React from 'react';
import { Button, Checkbox, Form, Input } from 'antd';
import styled from 'styled-components';
import { FormattedMessage } from 'react-intl';

const SubmitBtn = styled(Button)`
  width: 360px;
`;

interface Props {
  onLogin: (values: { username: string; password: string; remember: boolean }) => void;
}

export const LoginForm: React.FC<Props> = ({ onLogin }) => {
  return (
    <Form
      name="normal_login"
      className="login-form"
      initialValues={{ remember: true }}
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
  );
};
