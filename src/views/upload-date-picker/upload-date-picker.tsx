import React from 'react';
import { FormattedMessage } from 'react-intl';

import { DatePicker } from 'src/components';

interface Props {
  onDateRange: (dateRange: [string, string]) => void;
}

export const UploadDatePicker: React.FC<Props> = ({ onDateRange }) => {
  return (
    <DatePicker
      name={<FormattedMessage defaultMessage="上传时间" />}
      onDateRange={({ data, dataString }) => {
        onDateRange(data && dataString);
      }}
    />
  );
};
