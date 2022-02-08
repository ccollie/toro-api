import { LoadingOverlay } from '@mantine/core';
import React from 'react';
import NetworkError from '../NetworkError';

type TProps = {
  refetch: () => any;
  loading: boolean;
  error?: any;
};
const extractErrorMessage = (e?: any) => {
  return e?.response?.errors?.[0]?.message;
};
export const NetworkRequest: React.FC<TProps> = (props) => {
  if (props.loading) {
    return <LoadingOverlay style={{ margin: '25px, 0' }} visible={true} />;
  } else if (props.error) {
    return (
      <NetworkError
        message={extractErrorMessage(props.error)}
        refetch={props.refetch}
      />
    );
  } else {
    return <>{props.children}</>;
  }
};
export default NetworkRequest;
