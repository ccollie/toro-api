import  React, { useCallback, useEffect, useState } from 'react';
import { defaultColorScheme } from '../common/colors';
import { formatLabel } from '../common/utils';
import { DataItem, StringOrNumberOrDate } from '../common/models';
import s from './legend.module.css';

export interface AdvancedLegendItem {
  value: StringOrNumberOrDate;
  _value: StringOrNumberOrDate;
  color: string;
  data: DataItem;
  label: string;
  displayLabel: string;
  originalLabel: string;
  percentage: string;
  animations?:string;
}

export interface AdvancedLegendProps {
  className?: string;
  width?: string | number;
  animate?: boolean;
  label?: string;
  data: DataItem[];
  colors?: string[];
  onMouseEnter?: (data: DataItem) => void;
  onMouseLeave?: (data: DataItem) => void;
  onSelect?: (data: DataItem) => void;
  valueFormatter?: (value: StringOrNumberOrDate) => any;
  labelFormatter?: (value: string) => string;
  percentageFormatting?: (value: number) => string;
  getColor?: (label: string, value: StringOrNumberOrDate) => string;
}

const defaultValueFormatter: (value: StringOrNumberOrDate) => string = value => value.toLocaleString();
const defaultLabelFormatter: (value: string) => string = value => value;

export const AdvancedLegend: React.FC<AdvancedLegendProps> = (props) => {
  const {
    width = 'auto',
    data,
    label = 'Total',
    colors = defaultColorScheme,
    valueFormatter = defaultValueFormatter,
    labelFormatter = defaultLabelFormatter,
    percentageFormatting = (x: number) => x.toLocaleString(),
  } = props;
  const [legendItems, setLegendItems] = useState<AdvancedLegendItem[]>([]);
  const [roundedTotal, setRoundedTotal] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);

  useEffect(() => {
    const total = data.map(d => Number(d.value)).reduce((sum, d) => sum + d, 0);
    setRoundedTotal(Math.round(total));
    setTotal(total);
    setLegendItems(getLegendItems());
  }, [data])

  function getLegendItems(): AdvancedLegendItem[] {
    const formatPercentage = percentageFormatting || (x => x.toLocaleString());

    function getColor(index: number, label: string, value: StringOrNumberOrDate): string {
      if (props.getColor) {
        return props.getColor(label, value);
      }
      return colors[index % colors.length]
    }

    return data.map((d, index) => {
      const label = formatLabel(d.name);
      const value = d.value;
      const color = getColor(index, label, value);
      const percentage = total > 0 ? (value / total) * 100 : 0;
      const formattedLabel = labelFormatter(label);

      const res: AdvancedLegendItem = {
        value,
        _value: d.value,
        color,
        data: d,
        label,
        displayLabel: formattedLabel,
        originalLabel: label,
        percentage: formatPercentage(percentage),
      };

      return res;
    });
  }

  const onMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>, data: DataItem) => {
    e.preventDefault();
    props.onMouseEnter?.(data);
  }, [props.onMouseEnter]);

  const onMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>, data: DataItem) => {
    e.preventDefault();
    props.onMouseLeave?.(data);
  }, [props.onMouseEnter]);

  const onSelect = useCallback((e: React.MouseEvent<HTMLDivElement>, data: DataItem) => {
    e.preventDefault();
    props.onSelect?.(data);
  }, [props.onMouseEnter]);

  const style = {
    width: (typeof width === "number" ? width + 'px' : width)
  };

  return (
    <div className={`float-left overflow-visible font-light tracking-normal leading-8 text-gray-700 box-border ${props.className || ''}`}
         style={style}>
      <div className={s.totalValue}>
        {valueFormatter(roundedTotal)}
      </div>
      <div className={s.totalLabel}>{label}</div>
      <div className={s.legendItemsContainer}>
        <div className={s.legendItems}>
          {legendItems.map(item =>
            <div key={item.label} tabIndex={-1} className={s.legendItem}
                 onMouseEnter={(e) => onMouseEnter(e, item.data)}
                 onMouseLeave={(e) => onMouseLeave(e, item.data)}
                 onClick={(e) => onSelect(e, item.data)}
            >
              <div className={`float-left mr-2 w-1 h-10 tracking-normal leading-8 border-l-4 border-solid box-border`}
                   style={{borderLeftColor: item.color}}/>
              <div className="legend-value ml-3 -mt-2 text-2xl font-light tracking-normal leading-8 cursor-pointer box-border whitespace-no-wrap">
                {valueFormatter(item.value)}
              </div>
              <div className="legend-label ml-3 -mt-2 text-sm font-light tracking-normal leading-8 cursor-pointer box-border whitespace-no-wrap"
                style={{ opacity: 0.7 }}>
                {item.displayLabel}
              </div>
              <div
                className="ml-3 text-2xl font-light tracking-normal leading-8 cursor-pointer box-border whitespace-no-wrap"
                style={{ opacity: 0.7 }}
              >
                {item.percentage.toLocaleString()}%
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

