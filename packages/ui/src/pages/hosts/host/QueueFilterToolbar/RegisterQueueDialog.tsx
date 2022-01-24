import React, { useEffect, useState } from 'react';
import type { DiscoverQueuesPayload, HostActions, Queue } from 'src/types';
import { Button, Checkbox, Modal, Select, Space, Text } from '@mantine/core';
import { useToast } from 'src/hooks';

interface RegisterQueueDialogProps {
  actions: HostActions;
  onQueueAdded: (queue: Queue) => void;
  isOpen: boolean;
  onClose: () => void;
}

type SelectValue = {
  label: string;
  value: string;
};

const RegisterQueueDialog: React.FC<RegisterQueueDialogProps> = (props) => {
  const { onQueueAdded, actions, isOpen } = props;
  const [prefix, setPrefix] = useState<string>('');
  const [queue, setQueue] = useState<DiscoverQueuesPayload | null>(null);
  const [formValid, setFormValid] = useState(false);
  const [loading, setLoading] = useState(false);

  const [prefixValues, setPrefixValues] = useState<SelectValue[]>([]);
  const [queueValues, setQueueValues] = useState<SelectValue[]>([]);
  const [filtered, setFiltered] = useState<SelectValue[]>([]);

  const toast = useToast();

  function createSelectValue(q: DiscoverQueuesPayload): SelectValue {
    return {
      label: q.name,
      value: `${q.prefix}:${q.name}`
    }
  }

  function fetch() {
    setLoading(true);
    actions.discoverQueues(prefix || undefined, true).then((items) => {
      const prefixes = Array.from(new Set<string>(items.map((x: DiscoverQueuesPayload) => x.prefix))).sort();
      const prefixValues = prefixes.map((x) => ({ label: x, value: x }));
      const queueValues = items.map(createSelectValue);
      setQueueValues(queueValues);
      setPrefixValues(prefixValues);
      setFiltered(queueValues);
    }).finally(() => setLoading(false));
  }

  function onChange(value: any) {
    const [prefix, name] = (value + '').split(':');
    if (prefix && name) {
      const value: DiscoverQueuesPayload = {
        prefix,
        name,
      };
      setQueue(value);
    }
  }

  function handleClose(): void {
    props.onClose && props.onClose();
  }

  useEffect(() => {
    isOpen && fetch();
  }, [isOpen]);

  useEffect(() => {
    if (!prefix || prefix.length === 0) {
      setFiltered(queueValues);
    } else {
      setFiltered(queueValues.filter((x) => x.value.startsWith(prefix)));
    }
  }, [prefix, queueValues]);

  useEffect(() => {
    setFormValid(!!queue);
  }, [queue]);

  function remove(
    queues: SelectValue[],
    item: SelectValue
  ): SelectValue[] {
    return queues.filter((x) => {
      return !(item.label === x.label && item.value === x.value);
    });
  }

  async function registerQueue() {
    // onSelect && onSelect(value)
    if (!queue) {
      return;
    }
    const name = queue.name;
    const prefix = queue.prefix;

    try {
      const added = await actions.registerQueue(queue.prefix, queue.name);

      const toRemove = createSelectValue(queue);
      let newItems = remove(queueValues, toRemove);
      setQueueValues(newItems);

      newItems = remove(filtered, toRemove);
      setFiltered(newItems);
      setQueue(null);

      const msg = `Queue ${prefix && (prefix + ':')}${name} added`;
      toast.success(`${msg} successfully`);

      // form.resetFields();
      onQueueAdded && onQueueAdded(added);


    } catch (error) {
      const msg = (error as any).message || error;
      toast.error(msg);
    }
  }

  return (
    <Modal opened={isOpen} onClose={handleClose} title={"Register A Queue"} centered>
      <Text>
        Register an existing queue with the current host.
      </Text>
      <div>
        <form>
          <Select
            label="Prefix"
            placeholder="Prefix"
            onChange={(e) => setPrefix(String(e))}
            disabled={loading}
            className="w-full"
            data={prefixValues}
          />
          <div>
            <Select
              id="name"
              label="Name"
              required={true}
              placeholder="Select A Queue"
              onChange={onChange}
              disabled={loading}
              className="w-full"
              data={filtered}
            />
          </div>
          <Space h={"md"} />
          <div className="flex items-center">
            <Checkbox defaultChecked label="Track Statistics" id="c1"/>
          </div>
        </form>
        <div className="flex mt-25 justify-end">
          <Button
            disabled={loading || !formValid}
            aria-label="Add"
            onClick={registerQueue}
            loading={loading}
          >
            Add Queue
          </Button>
        </div>
      </div>
    </Modal>
  )
};

export default RegisterQueueDialog;
