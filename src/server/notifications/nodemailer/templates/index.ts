'use strict';
import { Queue } from 'bullmq';
import boom from '@hapi/boom';
import handlebars from 'handlebars';
import { AppInfo, NotificationContext } from '@src/types';
import mjml2html from 'mjml';
import path from 'path';
import fs from 'fs';
import getTitle from './getTitle';
import getSubject from './getSubject';
import getDescription from './getDescription';

type TemplateParts = 'head' | 'body' | 'subject' | 'html' | 'title';

export interface MailTemplate {
  subject: any;
  body: any;
  html: any;
  [k: string]: any;
}

export interface MailTemplateData
  extends Omit<NotificationContext, 'config' | 'urlService'> {
  brand: string;
  eventTitle: string;
  eventDescription: string;
  appInfo: AppInfo;
  ts: number;
  data: any;
}

export function getTemplate(name: string): handlebars.TemplateDelegate<any> {
  const templatePath = path.join(__dirname, name);
  const contents = fs.readFileSync(templatePath);
  return handlebars.compile(contents.toString());
}

const mainTemplate = getTemplate('main.mjml');

handlebars.registerPartial('header', getTemplate('header.mjml'));
handlebars.registerPartial('footer', getTemplate('footer.mjml'));

function getMain(
  context: NotificationContext,
  event: string,
  queue: Queue,
  data: any,
): string {
  const obj: MailTemplateData = {
    appInfo: context.appInfo,
    brand: context.appInfo.brand,
    env: context.env,
    host: context.host,
    ts: data['start'],
    eventTitle: getTitle(event, queue),
    eventDescription: getDescription(event, queue),
    data,
  };

  return mainTemplate(obj);
}

export function getMessage(
  context: NotificationContext,
  eventName: string,
  queue: Queue,
  data,
) {
  const xml = getMain(context, eventName, queue, data);
  const { html, errors } = mjml2html(xml);
  if (errors) {
    throw boom.badImplementation('Error in template', { errors });
  }
  const subject = getSubject(eventName, queue);
  return {
    subject,
    html,
  };
}
