'use strict';
import { createTransport } from 'nodemailer';
import { MailServerConfig } from '../../../types';
import { createDebug } from '../debug';
import logger from '../logger';
import Mail from 'nodemailer/lib/mailer';
import { getValue } from '../../config';
import schema, { defaultTransport } from './schema';
import htmlToText from 'html-to-text';

const debug = createDebug('notifications:mail-service');

let transport: Mail;
let mailConfig: MailServerConfig;

// eslint-disable-next-line max-len
const IsHtmlRe = /<(br|basefont|hr|input|source|frame|param|area|meta|!--|col|link|option|base|img|wbr|!DOCTYPE).*?>|<(a|abbr|acronym|address|applet|article|aside|audio|b|bdi|bdo|big|blockquote|body|button|canvas|caption|center|cite|code|colgroup|command|datalist|dd|del|details|dfn|dialog|dir|div|dl|dt|em|embed|fieldset|figcaption|figure|font|footer|form|frameset|head|header|hgroup|h1|h2|h3|h4|h5|h6|html|i|iframe|ins|kbd|keygen|label|legend|li|map|mark|menu|meter|nav|noframes|noscript|object|ol|optgroup|output|p|pre|progress|q|rp|rt|ruby|s|samp|script|section|select|small|span|strike|strong|style|sub|summary|sup|table|tbody|td|textarea|tfoot|th|thead|time|title|tr|track|tt|u|ul|var|video).*?<\/\2>/;

function isPossiblyHtml(str: string): boolean {
  return IsHtmlRe.test((str || '').toLowerCase());
}

async function _useTransport(config: MailServerConfig) {
  // setup transport
  // check explicit transport first, then smtp, then ses
  // fail if in sendMail mode
  const transportConfig = config.send
    ? { jsonTransport: true }
    : config.transport;

  if (!config.send) {
    debug('send disabled so we are ensuring JSONTransport');
  }
  transport = createTransport(transportConfig as any, config.message);
  if (config.verifyTransport) {
    if (transport.verify) {
      try {
        await transport.verify();
        logger.info('transport verify call success');
      } catch (error) {
        logger.error('transport verify call FAILED', { error });
      }
    } else {
      logger.warn('transport verify check not available');
    }
  }

  logger.debug('transport configured');

  return transport;
}

function loadConfig(): MailServerConfig {
  if (!mailConfig) {
    const fromConfig = getValue('mail', {
      transport: defaultTransport,
    });
    const { error, value } = schema.validate(fromConfig);
    if (error) {
      throw error;
    }
    mailConfig = value as MailServerConfig;
  }
  return mailConfig;
}

async function init() {
  return _useTransport(loadConfig());
}

/**
 * Send email.
 *
 * @async
 * @param {object} message - message options.
 * @returns {Promise<object | null>} details of the message sendMail
 */
export async function sendMail(message: Mail.Options): Promise<any> {
  if (!transport) {
    await init();
  }

  // trim subject
  if (message.subject) {
    message.subject = message.subject.trim();
    if (mailConfig.subjectPrefix) {
      message.subject = mailConfig.subjectPrefix + message.subject;
    }
    if (isPossiblyHtml(message.subject)) {
      message.subject = htmlToText.fromString(message.subject);
    }
  }

  if (message.html && !message.text) {
    message.text = htmlToText.fromString(message.html.toString());
  }

  // if we only want a text-based version of the email
  if (mailConfig.textOnly) delete message.html;

  const result = await transport.sendMail(message);

  // minimal email info
  // FIXME: what to log? what level? separate mail log? event?
  logger.debug('sent', {
    messageId: result.messageId,
    from: result.envelope.from,
    to: result.envelope.to,
    subject: result.originalMessage?.subject,
    response: result.response,
  });

  return result;
}
