import React from 'react';
import styled from 'styled-components';

interface Props {
  tag: string;
}

interface TagProps {
  bgColor: string;
  borderColor: string;
  text: string;
  textColor: string;
}

const Label = styled.div<TagProps>`
  padding: 0px 9px;
  font-size: 12px;
  background: ${(p) => p.bgColor};
  color: ${(p) => p.textColor};
  border: 1px solid ${(p) => p.borderColor};
  border-radius: 2px;
  display: flex;
  justify-content: center;
  align-items: center;
  &::after {
    content: '${(p) => p.text}';
  }
`;

const tagTable: Record<string, TagProps> = {
  QCF: {
    bgColor: '#FFF1F0',
    borderColor: '#FFA39E',
    text: 'QCF',
    textColor: '#F5222D',
  },
  REPEATED: {
    bgColor: '#F9F0FF',
    borderColor: '#D3ADF7',
    text: '重复',
    textColor: '#722ED1',
  },
  REDO: {
    bgColor: '#FFF0F6',
    borderColor: '#FFADD2',
    text: 'Redo',
    textColor: '#EB2F96',
  },
  INVALID: {
    bgColor: '#fafafa',
    borderColor: '#d9d9d9',
    text: '废弃',
    textColor: 'rgba(0,0,0,0.85)',
  },
  RESEARCH: {
    bgColor: '#fafafa',
    borderColor: '#d9d9d9',
    text: '科研',
    textColor: 'rgba(0,0,0,0.85)',
  },
  TRIAL: {
    bgColor: '#fafafa',
    borderColor: '#d9d9d9',
    text: '试用',
    textColor: 'rgba(0,0,0,0.85)',
  },
  BUSINESS: {
    bgColor: '#fafafa',
    borderColor: '#d9d9d9',
    text: '商业',
    textColor: 'rgba(0,0,0,0.85)',
  },
  TOLL: {
    bgColor: '#fafafa',
    borderColor: '#d9d9d9',
    text: '收费',
    textColor: 'rgba(0,0,0,0.85)',
  },
  RETURN_REPEAT: {
    bgColor: '#fafafa',
    borderColor: '#d9d9d9',
    text: '返还重复',
    textColor: 'rgba(0,0,0,0.85)',
  },
};

const CaseTags: React.FC<Props> = ({ tag }) => {
  const data = tagTable[tag];
  if (!data) {
    return (
      <Label bgColor="#fafafa" borderColor="#d9d9d9" text={tag} textColor="rgba(0,0,0,0.85)" />
    );
  }
  const { bgColor, borderColor, text, textColor } = data;
  return <Label bgColor={bgColor} borderColor={borderColor} text={text} textColor={textColor} />;
};

export default CaseTags;
