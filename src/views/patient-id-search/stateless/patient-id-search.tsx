import React from 'react';
import { FormattedMessage } from 'react-intl';

import { SearchInput } from 'src/components';

interface Props {
  onSearch: (v?: string) => void;
}

export const PatientIDSearch: React.FC<Props> = ({ onSearch }) => {
  return <SearchInput name={<FormattedMessage defaultMessage="PatientID" />} onSearch={onSearch} />;
};
