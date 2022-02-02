import { Snowflake } from 'nodejs-snowflake';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet(
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_',
  6,
);

const Epoch = +new Date(2022, 1, 1).getTime();

// eslint-disable-next-line camelcase
const idGenerator = new Snowflake({ custom_epoch: Epoch });

export function getUniqueId(): string {
  return idGenerator.getUniqueID().toString();
}

export function getTimestampFromId(id: string): number {
  const asBigInt = BigInt(id);
  return Snowflake.timestampFromID(asBigInt, idGenerator.customEpoch());
}

export function getMachineId(id: string): number {
  const asBigInt = BigInt(id);
  return Snowflake.instanceIDFromID(asBigInt);
}
export function getSnowflakeId(): string {
  return getUniqueId();
}

export { nanoid };
