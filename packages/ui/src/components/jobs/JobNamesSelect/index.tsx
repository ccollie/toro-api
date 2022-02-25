import { useQuery } from '@apollo/client';
import { BaseSelectProps } from '@mantine/core/lib/components/Select/types';
import React, { useCallback, useState, useEffect } from 'react';
import { MultiSelect, Select } from '@mantine/core';
import { LoadingIcon } from 'src/components/Icons';
import { makeArray } from 'src/lib';
import { GetQueueJobsNamesDocument } from 'src/types';

interface JobNamesSelectProps extends BaseSelectProps {
  queueId: string;
  isMulti?: boolean;
  isClearable?: boolean;
  selected?: string | string[];
  onChange?: (values: string[]) => void;
  onCreated?: (values: string) => void;
  label?: string;
}

type DataItem = {
  value: string;
  label: string;
};

const JobNamesSelect: React.FC<JobNamesSelectProps> = (props) => {
  const {
    queueId,
    selected,
    isMulti = true,
    isClearable = true,
    label,
    onChange,
    onCreated,
    ...rest
  } = props;

  const [options, setOptions] = useState<DataItem[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [singleSelected, setSingleSelected] = useState<string | null>(null);
  const [error, setError] = useState<Error | undefined>();
  const [placeholder, setPlaceholder] = useState<string | undefined>();

  useEffect(() => {
    if (selected) {
      if (isMulti) {
        selected && setSelectedOptions(makeArray(selected));
      } else {
        if (selected) {
          const value = Array.isArray(selected) ? selected[0] : selected;
          setSingleSelected(value);
        }
      }
    }
  }, [selected, isMulti]);

  const { loading } = useQuery(GetQueueJobsNamesDocument, {
    variables: { id: queueId },
    onCompleted(data) {
      const { jobNames = [] } = data.queue ?? {};
      const options = jobNames.map(createOption);
      setOptions(options);
    },
    onError(err) {
      setError(err);
    },
  });

  useEffect(() => {
    if (loading) {
      setPlaceholder('Loading...');
    } else if (error) {
      // todo: clear after some time. The user cann always create
      setPlaceholder('Error loading job names');
    } else {
      const value = isMulti
        ? 'Select One or more'
        : 'Select or Creeate a Job Name';
      setPlaceholder(value);
    }
  }, [error, isMulti, loading]);

  function createOption(name: string): DataItem {
    return {
      value: name,
      label: name,
    };
  }

  const onCreateOption = useCallback(
    (searchValue: string) => {
      const normalizedSearchValue = searchValue.trim().toLowerCase();

      if (!normalizedSearchValue) {
        return;
      }

      const newOption = createOption(searchValue);

      // Create the option if it doesn't exist.
      if (
        options.findIndex(
          (option) =>
            option.label.trim().toLowerCase() === normalizedSearchValue,
        ) === -1
      ) {
        setOptions([...options, newOption]);
        onCreated && onCreated(searchValue);
      }
    },
    [queueId],
  );

  function handleMultiChange(selectedOptions: string[]) {
    setSelectedOptions(selectedOptions);
  }

  function handleSingleChange(value: string) {
    onChange?.(value ? [value] : []);
  }

  if (isMulti) {
    return (
      <MultiSelect
        searchable
        label={label}
        clearable={isClearable}
        data={options}
        icon={loading && <LoadingIcon />}
        disabled={loading}
        placeholder={placeholder}
        defaultValue={selectedOptions}
        onChange={handleMultiChange}
        onCreate={onCreateOption}
        {...rest}
      />
    );
  }
  return (
    <Select
      searchable
      label={label}
      clearable={isClearable}
      icon={loading && <LoadingIcon />}
      disabled={loading}
      placeholder={placeholder}
      data={options}
      value={singleSelected}
      creatable
      onCreate={onCreateOption}
      getCreateLabel={(query) => `+ Create ${query}`}
      onChange={handleSingleChange}
      {...rest}
    />
  );
};

export default JobNamesSelect;
