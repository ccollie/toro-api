import remark from 'remark';
import html from 'remark-html';

export function linkify(uri: string, description?: string): string {
  if (description) {
    return `[${description}](${uri})`;
  } else {
    return `<${uri}>`;
  }
}

export function bold(value: unknown): string {
  return `**${value}**`;
}

/**
 * @param {string} txt
 * @returns {string}
 */
export function italicize(txt: string): string {
  return `_${txt}_`;
}

export function markdownToHtml(md: string): string {
  const res = remark().use(html, { sanitize: true }).processSync(md);
  return res.toString();
}
