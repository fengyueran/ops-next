import React from 'react';
import { FormattedMessage } from 'react-intl';

import { SearchInput } from 'src/components';

interface Props {
  onSearch: (v?: string) => void;
}

export const CaseIDSearch: React.FC<Props> = ({ onSearch }) => {
  return <SearchInput name={<FormattedMessage defaultMessage="CaseID" />} onSearch={onSearch} />;
};
