import config from '../../config';
import { Supervisor } from '../../monitor';
import { packageInfo } from '../../packageInfo';

const monitor = Supervisor.getInstance();

// todo: add PubSub
const context = {
  monitor,
  supervisor: monitor,
  config,
  packageInfo,
};

export default context;
