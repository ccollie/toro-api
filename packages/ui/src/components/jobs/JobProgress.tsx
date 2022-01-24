import React from 'react';
import { Highlight } from '@/components/Highlight/Highlight';
import  { Popover, Progress } from '@mantine/core';
import { useDisclosure } from 'src/hooks';

interface JobProgressProps {
  value: Record<string, any> | number | string;
  size?: 'default' | 'small';
}

function ProgressPopover({
  value,
}: {
  value: Record<string, any>;
}) {
  const {
    isOpen,
    onClose,
  } = useDisclosure({ defaultIsOpen: false });

  const jsonString = JSON.stringify(value, null, 2);

  return (
    <Popover
      withArrow
      withCloseButton
      title="Hover for Value"
      position="top"
      target="Progress"
      opened={isOpen}
      onClose={onClose}>
      <Highlight language="json">{jsonString}</Highlight>
    </Popover>
  );
}

export const JobProgress: React.FC<JobProgressProps> = ({
  value,
}) => {
  switch (typeof value) {
    case 'object':
      return <ProgressPopover value={value} />;
    case 'number':
      if (value > 100) {
        return <div className="progress-wrapper">{value}</div>;
      }
      return (
        <div className="progress-wrapper">
          <Progress style={{ width: 36 }} value={value} size="md" label={`${value}%`}/>
        </div>
      );
    case 'string':
      return <div className="progress-wrapper">{value}</div>;
    default:
      return <>--</>;
  }
};

export default JobProgress;
