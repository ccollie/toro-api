import { EVENT_NAMES } from '../../utils';
import alertHandler from './alert.triggered';
import alertResetHandler from './alert.reset';
import defaultHandler from './default-handler';

const handlers = {
  'alert.triggered': alertHandler,
  'alert.reset': alertResetHandler,
  default: defaultHandler,
};

EVENT_NAMES.forEach((key) => {
  handlers[key] = handlers[key] || defaultHandler;
});

export default handlers;
