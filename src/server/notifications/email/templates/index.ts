'use strict';
import boom from '@hapi/boom';
import handlebars from 'handlebars';
import { NotificationContext } from '@src/types';
import mjml2html from 'mjml';
import path from 'path';
import fs from 'fs';
import { getTitle } from '../../utils';
import Mail from 'nodemailer/lib/mailer';
import { logger, markdownToHtml, systemClock } from '@src/server/lib';
import { handlebarsHelpers } from './helpers';

type TemplateFn = handlebars.TemplateDelegate<any>;

const EmailTemplatePath = process.env.EMAIL_TEMPLATE_PATH || __dirname;
const isProd = ['production', 'prod'].includes(process.env.NODE_ENV);

export function loadTemplate(name: string): string {
  const templatePath = path.join(EmailTemplatePath, name);
  const contents = fs.readFileSync(templatePath);
  return contents.toString();
}

let mainTemplate: string;
const templateCache = new Map<string, TemplateFn>();

function getTemplateFn(mjml: string): TemplateFn {
  let fn = templateCache.get(mjml);
  if (!fn) {
    fn = handlebars.compile(mjml);
    templateCache.set(mjml, fn);
  }
  return fn;
}

function transformTemplate(data: Record<string, any>): string {
  mainTemplate = mainTemplate || loadTemplate('main.mjml');
  const { html, errors } = mjml2html(mainTemplate, {
    filePath: EmailTemplatePath,
    keepComments: !isProd,
    minify: isProd,
    beautify: !isProd,
    preprocessors: [
      (xml) => {
        const handler = getTemplateFn(xml);
        return handler(data, { helpers: handlebarsHelpers });
      },
    ],
  });
  if (errors && errors.length) {
    errors.forEach((err) => {
      logger.warn(err);
    });
    throw boom.badImplementation('Error in template', { errors });
  }
  return html;
}

function getData(
  context: NotificationContext,
  event: string,
  data: Record<string, any>,
): Record<string, any> {
  const message = data.message;
  if (message) {
    // at this point, we're markdown
    data.message = new handlebars.SafeString(markdownToHtml(message));
  }
  return {
    ...context,
    ts: data['start'] || systemClock.getTime(),
    title: getTitle(event, context, data),
    ...data,
  };
}

export function getMessage(
  context: NotificationContext,
  eventName: string,
  data: Record<string, any>,
): Mail.Options {
  const templateData = getData(context, eventName, data);
  const subject = templateData.title;
  const html = transformTemplate(templateData);

  return {
    subject,
    html,
  };
}
