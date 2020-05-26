'use strict';
import { Queue } from 'bullmq';
import glob from 'glob';
import path from 'path';
import fs from 'fs';
import handlebars from 'handlebars';
import { createTransport, SendMailOptions } from 'nodemailer';
import schema from './schema';
import { registerHelpers } from './templates/helpers';
import { EVENT_NAMES } from '../utils';
import { getMessage } from './templates';
import {
  MailNotifierConfig,
  NotificationContext,
  NotificationInitContext,
  NotificationPlugin,
} from '@src/types';
import getSubject from './templates/getSubject';
import { createDebug } from '../../lib/debug';

const debug = createDebug('notifications:mail');

interface MailTemplate {
  subject: any;
  text: any;
  html: any;
  [k: string]: any;
}

type TemplatesMap = Map<string, MailTemplate>;

/*
 * Load all templates into a nice object like…
 *
 * {
 *   body: {
 *     outage: $template
 *   },
 *   subject {
 *     outage: $template
 *   }
 * }
 */
function getTemplates(baseDirectory: string): TemplatesMap {
  const files = glob.sync(path.join(baseDirectory, '**/*.hbs'));
  const templates = new Map();
  files.forEach(function (templatePath: string) {
    const parts = path.parse(templatePath);
    const contents = fs.readFileSync(templatePath);
    const parentDir = parts.dir.split(path.sep).pop();

    let parent = templates.get(parentDir);
    if (!parent) {
      parent = new Map<string, MailTemplate>();
    }
    parent[parts.name] = handlebars.compile(contents.toString());
    debug('Found %s template for %s', parentDir, parts.name);
  });

  return templates;
}

/*
 * Check if using default template location or one defined in environment
 */
function loadTemplates(templateDir: string): TemplatesMap {
  let p = path.join(__dirname, 'templates');
  if (templateDir) {
    p = templateDir;
    debug('Loading templates from %s instead of default templates.', p);
  }
  return getTemplates(p);
}

function createTransporter(options: MailNotifierConfig) {
  const { messageDefaults = {}, transport } = options;
  if (typeof transport === 'string') {
    return createTransport(transport, messageDefaults);
  } else {
    // todo: validate
    return createTransport(transport as any, messageDefaults);
  }
}

/*
 * Handle errors during email transport
 */
function emailError(err, info) {
  if (err) {
    return console.log(err);
  }

  console.log(info);
}

/*
 * Any event from monitor can have a template associated with it. If there's
 * one in templates/body/, an email will be sent to notify support teams!
 */
function init(
  context: NotificationInitContext,
  options: MailNotifierConfig,
): void {
  const { templateDir } = options;
  const transporter = createTransporter(options);
  const templates = loadTemplates(templateDir);

  function getMessageFromTemplate(
    eventName: string,
    context: NotificationContext,
    queue: Queue,
    data,
  ): SendMailOptions {
    const template = templates.get(eventName);
    // Don't bother if there's no template
    if (!template) {
      return null;
    }

    // Pass this stuff into the templates
    const ctx = { context, queue, data };

    // Give us a template subject or default
    let subject;
    if (template.subject) {
      subject = template.subject(ctx);
    } else {
      subject = getSubject(eventName, queue);
    }

    const text = template.text(ctx);
    return {
      subject,
      text,
    };
  }

  function handleEvent(eventName: string) {
    return function (context: NotificationContext, queue: Queue, data) {
      let msg = getMessageFromTemplate(eventName, context, queue, data);
      if (!msg) {
        msg = getMessage(context, eventName, queue, data);
      }

      return transporter.sendMail(msg);
      // todo: log
    };
  }

  EVENT_NAMES.forEach((name) => {
    context.on(name, handleEvent(name));
  });
}

registerHelpers();

export const emailPlugin: NotificationPlugin = {
  init,
  schema,
};
