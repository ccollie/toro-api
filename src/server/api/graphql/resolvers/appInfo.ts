'use strict';
import { AppInfo } from '@src/types';
import { Supervisor } from '../../common/imports';

export const appInfoResolver = {
  Query: {
    appInfo(): AppInfo {
      return Supervisor.getAppInfo();
    },
  },
};
