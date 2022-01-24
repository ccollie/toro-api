import { ViewUpdate } from '@codemirror/view';
import { Button, Group } from '@mantine/core';
import { EditorState, EditorView } from '@uiw/react-codemirror';
import React, { useCallback, useState } from 'react';
import { useCallbackRef, useDisclosure, useWhyDidYouUpdate } from '@/hooks';
import { validateQuery } from '@/services/job-filter/query-parser';
import FilterEditor from './FilterEditor';
import QueryHistoryPopover from './query-history/QueryHistoryPopover';
import { useQueueJobFilters } from 'src/services';
import { DEFAULT_FILTER } from './constants';

interface QueryBarProps {
  queueId: string;
  placeholder?: string;
  defaultFilter?: string;
  onReset: () => void;
  onApply: (filter: string) => void | Promise<void>;
  onChange?: (value: string) => void;
}

export const QueryBar = (props: QueryBarProps) => {
  const [isValid, setValid] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [lastExecutedQuery, setLastExecutedQuery] = useState<string>('');
  const [filter, setFilter] = useState<string>(
    props.defaultFilter ?? DEFAULT_FILTER
  );
  const [isEmptyQuery, setIsEmptyQuery] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const {placeholder = 'Job Filter' } = props;
  const [editorValue, setEditorValue] = useState<EditorView>();
  const [editorState, setEditorState] = useState<EditorState>();

  const {
    isOpen: isHistoryDialogOpen,
    onClose: closeHistoryDialog,
    onToggle: toggleHistoryDialog,
  } = useDisclosure({
    defaultIsOpen: false,
  });

  useWhyDidYouUpdate('QueryBar', props);

  const { addToHistory } = useQueueJobFilters(props.queueId);

  /**
   * Sets `queryString` and `valid`, and if it is a valid input
   * If it is not a valid query, only set `valid` to `false`.
   * @param {String} input   the query string (i.e. manual user input)
   */
  function setQueryString(input: string): void {
    const toValidate = (input ?? '').trim();
    setIsEmptyQuery(toValidate.length === 0);
    if (isValid) {
      setFilter(input);
    }
    setHasError(!isValid && !isEmptyQuery);
    props.onChange?.(input);
  }

  /**
   * dismiss current changes to the query and restore `{}` as the query.
   */
  function reset() {
    // if the current query is the same as the default, nothing happens
    const trimmed = filter?.trim() ?? '';
    if (trimmed === '') {
      return;
    }

    // if the last executed query is the default query, we don't need to
    // change lastExecuteQuery and trigger a change in the QueryChangedStore.
    if (lastExecutedQuery === '' || !lastExecutedQuery) {
      setQueryString('');
      return;
    }

    // otherwise we do need to trigger and let all other
    // components in the app know about the change so they can re-render.
    if (isValid) {
      setValid(true);
      setFilter(DEFAULT_FILTER);
    }
  }

  /**
   * apply the current (valid) query, and store it in `lastExecutedQuery`.
   */
  const applyFilter = useCallbackRef(() => {
    if (validateQuery(filter)) {
      setValid(true);
      setLastExecutedQuery(filter);
      if (!isEmptyQuery) {
        addToHistory(filter);
      }
      setIsLoading(true);
      Promise.resolve(props.onApply?.(filter)).finally(() => {
        setIsLoading(false);
      });
    } else {
      setValid(false);
    }
  });

  const handleApply = useCallback((evt: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    if (evt) {
      evt.preventDefault();
      evt.stopPropagation();
    }
    applyFilter();
  }, []);


  function onResetButtonClicked() {
    const { onReset } = props;
    setFilter(DEFAULT_FILTER);
    reset();
    onReset?.();
  }

  function onFilterSelected({ expression }: { expression: string }) {
    setQueryString(expression);
    closeHistoryDialog();
  }

  const onEditorInit = useCallback((view: EditorView, state: EditorState) => {
    setEditorValue(view);
    setEditorState(state);
  }, []);

  const onEditorChange = useCallback((value: string, _: ViewUpdate) => {
    value = value.trim();
    const valid = validateQuery(value);
    setValid(valid);
    setQueryString(value);
  }, []);

  return (
    <Group position="apart" grow>
      <FilterEditor
        value={filter}
        onChange={onEditorChange}
        onInit={onEditorInit}
        placeholder={placeholder}
      />
      <Group position="right" spacing="xs" grow={false}>
        <Button
          compact
          onClick={handleApply}
          disabled={isLoading || !filter || !isValid}
          loading={isLoading}
        >
          Find
        </Button>
        <Button compact onClick={onResetButtonClicked}>Reset</Button>
        <QueryHistoryPopover
          queueId={props.queueId}
          currentFilter={filter}
          toggleOpen={toggleHistoryDialog}
          isOpen={isHistoryDialogOpen}
          onClose={closeHistoryDialog}
          onFilterClick={onFilterSelected}
        />
      </Group>
    </Group>
  );
};
