import React, { useEffect, useState } from 'react';

import { microAppMgr, MessageType } from 'src/utils';

export const withData =
  <P extends object>(WrappedComponent: React.ComponentType<P>) =>
  ({ ...props }) => {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      microAppMgr.subscribe((state) => {
        const { type } = state;
        if (type === MessageType.TOOL_READY) {
          setLoading(false);
        }
      });

      return () => {
        microAppMgr.unsubscribe();
      };
    }, []);

    return <WrappedComponent {...(props as P)} loading={loading} />;
  };
