import { Checkbox } from '@mantine/core';
import React, { useCallback } from 'react';
import { useSelection } from 'src/hooks';
import s from 'src/pages/queue/jobs/ExportJobsModal/FieldList.module.css';

interface FieldType {
  id: string;
  title: string;
  description: string;
}

export const JobFields: FieldType[] = [
  {
    id: 'id',
    title: 'Id',
    description: 'Job Id',
  },
  {
    id: 'name',
    title: 'Job Name',
    description: 'The name of the Job',
  },
  {
    id: 'timestamp',
    title: 'Timestamp',
    description: 'Job creation timestamp',
  },
  {
    id: 'data',
    title: 'Data',
    description: 'The job data',
  },
  {
    id: 'opts',
    title: 'Options',
    description: 'The job options',
  },
  {
    id: 'attemptsMade',
    title: 'Attempts Made',
    description: 'Job attempts',
  },
  {
    id: 'processedOn',
    title: 'Processed On',
    description: 'A timestamp of when the job started executing',
  },
  {
    id: 'finishedOn',
    title: 'Finished On',
    description: 'The timestamp of when the job finished executing',
  },
  {
    id: 'failedReason',
    title: 'Failed Reason',
    description: 'The reason the job failed',
  },
  {
    id: 'stackTrace',
    title: 'Stacktrace',
    description: 'Error stack',
  },
  {
    id: 'returnvalue',
    title: 'Return Value',
    description: 'The value returned from the job',
  },
];

export const AllFieldNames = JobFields.map(x => x.id);

interface TProps {
  height?: number;
  onChange?: (fields: string[]) => void;
}

export const FieldList: React.FC<TProps> = (props) => {
  const { onChange } = props;

  const { isAllSelected, isSelected, toggleSelectionAll, selectItem, unselectItem, selectedItems } =
    useSelection(JobFields);

  const onSelectAllClick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    toggleSelectionAll();
  }, []);

  function onSelectClick(e: React.ChangeEvent<HTMLInputElement>, id: string) {
    e.preventDefault();
    const checked = e.target.checked;
    if (checked) {
      selectItem(id);
    } else {
      unselectItem(id);
    }
    const ids = selectedItems.map((item) => item.id);
    onChange?.(ids);
  }

  const FieldStyle = { width: '185px', align: 'left' };

  return (
    <>
      <div className={`${s.scrollTable}`}>
        <table>
          <thead>
            <tr>
              <th>
                <Checkbox
                  id="select-all"
                  aria-label="Select all fields"
                  checked={isAllSelected}
                  onChange={onSelectAllClick}
                />
              </th>
              <th style={FieldStyle}>Field</th>
              <th>Description</th>
            </tr>
          </thead>
        </table>
        <div className={s.scrollTableBody}>
          <table>
            <tbody>
              {JobFields.map((field) => (
                <tr key={field.id}>
                  <td>
                    <Checkbox
                      id={field.id}
                      checked={isSelected(field.id)}
                      onChange={(e) => onSelectClick(e, field.id)}
                    />
                  </td>
                  <td style={FieldStyle}>&nbsp;{field.title}</td>
                  <td>{field.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};
