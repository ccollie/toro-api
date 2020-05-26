import { uuidv4 } from './utils';

/**
 * @param {BlobPart} data
 * @param {string} filename
 */
export function downloadString(data, filename: string): void {
  filename = filename || `${uuidv4()}.txt`;
  const fileURL = window.URL.createObjectURL(new Blob([data]));
  const fileLink = document.createElement('a');
  fileLink.href = fileURL;
  fileLink.setAttribute('download', filename);
  document.body.appendChild(fileLink);
  fileLink.click();
  document.body.removeChild(fileLink);
}

/**
 * @param {object} data
 * @param {string} filename
 */
export function downloadJson(data, filename: string): void {
  filename = filename || `${uuidv4()}.json`;
  const stringData = JSON.stringify(data || {}, null, 2);
  return downloadString(stringData, filename);
}
