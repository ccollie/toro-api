import boom from '@hapi/boom';
import { Channel } from '../channel';
import { sendMail, validateEmail } from '../../lib';
import { getMessage } from './templates';
import { NotificationChannelProps, NotificationContext } from '../types';

export interface MailChannelConfig extends NotificationChannelProps {
  readonly type: 'mail';
  recipients: string[];
}

export class MailChannel extends Channel<MailChannelConfig> {
  constructor(options: MailChannelConfig) {
    super(options);
  }

  get recipients(): string[] {
    return this.options.recipients;
  }

  set recipients(value: string[]) {
    if (!(value && value.length)) {
      throw boom.badData('At least 1 email address must be specified');
    }
    value.forEach((address) => {
      if (!validateEmail(address)) {
        throw boom.badData(`Invalid email address "${address}"`);
      }
    });
    this.options.recipients = value;
  }

  update(options: Partial<MailChannelConfig>): void {
    const { recipients, ...rest } = options;
    super.update(rest);
    if (options.hasOwnProperty('recipients')) {
      this.recipients = recipients;
    }
  }

  async dispatch(
    context: NotificationContext,
    data: Record<string, any>,
    eventName?: string,
  ): Promise<void> {
    const msg = getMessage(context, eventName, data);
    msg.to = this.recipients;

    await sendMail(msg);
  }
}
