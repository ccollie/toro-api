export enum QueryState {
  RESET_STATE = 'reset',
  APPLY_STATE = 'apply',
}

export const DEFAULT_FILTER = '';
export const DEFAULT_LIMIT = 20;
export const DEFAULT_STATE: QueryState = QueryState.RESET_STATE;
export const DEFAULT_BUTTON_LABEL = 'Find';
