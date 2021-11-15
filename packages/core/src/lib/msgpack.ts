import { Packr } from 'msgpackr';

const packer = new Packr({
  useRecords: false,
  encodeUndefinedAsNil: true,
});

export const encode = packer.pack;
export const decode = packer.unpack;
