
import * as React from 'react';
import { EnvConfig } from 'src/config';

/**
 * @ignore - internal component.
 */
export interface Tablelvl2ContextProps {
  /**
   * The current value of the context.
   */
  variant: 'head' | 'body' | 'footer';
}

const Tablelvl2Context = React.createContext<Tablelvl2ContextProps | undefined>(undefined);

if (!EnvConfig.prod) {
  Tablelvl2Context.displayName = 'Tablelvl2Context';
}

export default Tablelvl2Context;
