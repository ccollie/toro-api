import React, { useState } from 'react';

import {
  Group,
  Popover,
  Select,
  NumberInput,
} from '@mantine/core';
import { useDisclosure } from '@/hooks';
import { Expression } from 'src/components/Expression';

export const MetricExpression = () => {
  const {
    isOpen: isMetricOpen,
    onOpen: openMetricPopover,
    onClose: closeMetricPopover,
  } = useDisclosure();

  const {
    isOpen: isAggregateOpen,
    onOpen: openAggregatePopover,
    onClose: closeAggregatePopover,
  } = useDisclosure();

  const [example1, setExample1] = useState({
    isOpen: false,
    value: 'count()',
  });

  const [example2, setExample2] = useState({
    value: 100,
    description: 'Is above',
  });

  const changeExample1 = (value: string | null) => {
    setExample1({
      ...example1,
      value: value ?? '',
    });
  };

  const changeExample2Value = (value: number | undefined) => {
    setExample2({
      ...example2,
      value: value ?? 0
    });
  };

  const changeExample2Description = (value: string | null) => {
    setExample2({
      ...example2,
      description: value ?? '',
    });
  };

  const renderAggregatePopover = () => (
    <div style={{ zIndex: 200 }}>
      <Select
        value={example1.value}
        onChange={changeExample1}
        data={[
          { value: 'count()', text: 'count()' },
          { value: 'average()', text: 'average()' },
          { value: 'sum()', text: 'sum()' },
          { value: 'median()', text: 'median()' },
          { value: 'min()', text: 'min()' },
          { value: 'max()', text: 'max()' },
        ]}
      />
    </div>
  );

  const renderMetricPopover = () => (
    <div style={{ zIndex: 200 }}>
      <Group spacing="sm" grow={false}>
        <div style={{ width: 150 }}>
          <Select
            value={example2.description}
            onChange={changeExample2Description}
            data={[
              { value: 'Is above', label: 'Is above' },
              { value: 'Is below', label: 'Is below' },
              { value: 'Is exactly', label: 'Is exactly' },
            ]}
          />
        </div>

        <div style={{ width: 100 }}>
          <NumberInput
            defaultValue={example2.value}
            onChange={changeExample2Value}
          />
        </div>
      </Group>
    </div>
  );

  return (
    <Group spacing="sm" grow={false}>
      <div>
        <Popover
          withArrow
          title="When"
          target={
            <Expression
              description="when"
              value={example1.value}
              isActive={isAggregateOpen}
              onClick={openAggregatePopover}
            />
          }
          opened={isAggregateOpen}
          onClose={closeAggregatePopover}>
          {renderAggregatePopover()}
        </Popover>
      </div>

      <div>
        <Popover
          withArrow
          target={
            <Expression
              description={example2.description}
              value={example2.value}
              isActive={isMetricOpen}
              onClick={openMetricPopover}
            />
          }
          opened={isMetricOpen}
          onClose={closeMetricPopover}>
          {renderMetricPopover()}
        </Popover>
      </div>
    </Group>
  );
};

export default MetricExpression;
