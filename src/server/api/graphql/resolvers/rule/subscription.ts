import { createResolver } from '../../subscription';
import { GraphQLFieldResolver } from 'graphql';

export function ruleAlertTriggered(): GraphQLFieldResolver<any, any> {
  let unsub: Function;

  function getChannelName(_, { queueId, ruleId }): string {
    let name = `RULE_ALERT_TRIGGERED:${queueId}`;
    if (ruleId) name += `:${ruleId}`;
    return name;
  }

  function onSubscribe(_, { queueId, ruleId }, context): void {
    const { channelName, pubsub, supervisor } = context;
    const queueManager = supervisor.getQueueById(queueId);
    const { ruleManager } = queueManager;

    function handler(event): Promise<void> {
      return pubsub.publish(channelName, { state: event });
    }

    unsub = ruleManager.onAlertTriggered(ruleId, handler);
  }

  async function onUnsubscribe(): Promise<void> {
    return unsub && unsub();
  }

  return createResolver({
    channelName: getChannelName,
    onSubscribe,
    onUnsubscribe,
  });
}

export function ruleAlertReset(): GraphQLFieldResolver<any, any> {
  let unsub: Function;

  function getChannelName(_, { queueId, ruleId }): string {
    let name = `RULE_ALERT_RESET:${queueId}`;
    if (ruleId) name += `:${ruleId}`;
    return name;
  }

  function onSubscribe(_, { queueId, ruleId }, context): void {
    const { channelName, pubsub, supervisor } = context;
    const queueManager = supervisor.getQueueById(queueId);
    const { ruleManager } = queueManager;

    function handler(event): Promise<void> {
      return pubsub.publish(channelName, { state: event });
    }

    unsub = ruleManager.onAlertReset(ruleId, handler);
  }

  async function onUnsubscribe(): Promise<void> {
    return unsub && unsub();
  }

  return createResolver({
    channelName: getChannelName,
    onSubscribe,
    onUnsubscribe,
  });
}

export const Subscription = {
  ruleAlertTriggered: {
    subscribe: ruleAlertTriggered(),
  },
  ruleAlertReset: {
    subscribe: ruleAlertReset(),
  },
};
