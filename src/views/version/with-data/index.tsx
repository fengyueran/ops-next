import React, { useEffect, useState } from 'react';

import { getVersion } from 'src/api';

export const withData =
  <P extends object>(WrappedComponent: React.ComponentType<P>) =>
  ({ ...props }) => {
    const [version, setVerson] = useState<string>();

    useEffect(() => {
      const start = async () => {
        try {
          const version = await getVersion();
          setVerson(version);
        } catch (error) {
          console.warn('Get version error', error);
        }
      };
      start();
    }, []);

    return <WrappedComponent {...(props as P)} version={version} />;
  };
