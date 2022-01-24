let env: string;

const hostname = window?.location?.hostname;
if (hostname === 'www.el-toro.com') {
  env = 'production';
} else {
  env = 'development';
}

export const environment = env;

export const isProduction = env === 'production';

export const apiUrl = isProduction
  ? 'https://api.el-toro.com/graphql'
  : 'http://localhost:4000/graphql';


export const wsUrl = isProduction
  ? 'ws://api.el-toro.com/graphql'
  : 'ws://localhost:4000/graphql';

export const webUrl = isProduction
  ? 'https://www.el-toro.com'
  : 'http://localhost:3000';
