import config from '../config';
import { random } from 'lodash';
import { UniqueID } from 'nodejs-snowflake';

const Epoch = +new Date(2020, 1, 1);

function getMachineID(): number {
  const id = config.get('machineId');
  const machineId: number = parseInt(id, 10);
  return isNaN(machineId) ? random(0, 4096) : machineId;
}

const idConfig = {
  // Defaults to false. If set to true, the returned ids will be of type bigint
  // or else of type string
  returnNumber: false,
  customEpoch: Epoch, // Defaults to 1546300800000 (01-01-2019). This is UNIX timestamp in ms
  machineID: getMachineID(),
};

const idGenerator = new UniqueID(idConfig);

export function getUniqueId(): string {
  return idGenerator.getUniqueID() as string;
}

export function getTimestampFromId(id: string): number {
  return idGenerator.getTimestampFromID(id);
}

export function getSnowflakeId(): string {
  return getUniqueId();
}
