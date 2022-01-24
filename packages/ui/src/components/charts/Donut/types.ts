export interface ArcDataItem {
  value: number;
  color?: string;
  name: string;
}

export type OnHoverCallback = (index: number, item?: ArcDataItem) => void;
