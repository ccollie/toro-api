export type StringOrNumberOrDate = string | number | Date;

export interface DataItem {
  name: StringOrNumberOrDate;
  value: number;
  extra?: any;
  min?: number;
  max?: number;
  label?: string;
}

export interface SingleSeries extends Array<DataItem> {}

export interface PieGridDataItem extends DataItem {
  percent: number;
  total: number;
  value: number;
}

export type DataPoint = {
  date: Date;
  value: number;
};

export type Series = {
  label: StringOrNumberOrDate;
  data: DataPoint[];
};
