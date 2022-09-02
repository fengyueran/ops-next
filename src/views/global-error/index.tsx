import { useEffect } from 'react';
import { message } from 'antd';
import { useSelector, useDispatch } from 'react-redux';

import { other } from 'src/redux';

export const Error = ({ ...props }) => {
  const dispatch = useDispatch();
  const error = useSelector(other.selectors.error);

  useEffect(() => {
    if (error) {
      message.error({
        content: `${error.type}: ${error.detail}`,
        onClose: () => {
          dispatch(other.actions.setError());
        },
      });
    }
  }, [dispatch, error]);

  return null;
};
