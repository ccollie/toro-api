'use strict';

export default {
  StatsInterface: {
    __resolveType(value): string {
      if (value.hasOwnProperty('mean')) {
        return 'StatsSnapshot';
      }
      return 'Throughout';
    },
  },
};
