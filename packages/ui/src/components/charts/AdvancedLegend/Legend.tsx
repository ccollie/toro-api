import  React, { useCallback, useEffect, useState } from 'react';
import { roundTo } from 'src/lib';
import { defaultColorScheme } from '../common/colors';
import { formatLabel } from '../common/utils';
import { DataItem, StringOrNumberOrDate } from '../common/models';

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
  totalPosition?: 'left' | 'top' | 'none';
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
const defaultPercentageFormatter: (value: number) => string = value => roundTo(value,1).toLocaleString();

export const AdvancedLegend: React.FC<AdvancedLegendProps> = (props) => {
  const {
    width = 'auto',
    data,
    label = 'Total',
    totalPosition = 'left',
    colors = defaultColorScheme,
    valueFormatter = defaultValueFormatter,
    labelFormatter = defaultLabelFormatter,
    percentageFormatting = defaultPercentageFormatter,
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
  }, [props.onMouseLeave]);

  const onSelect = useCallback((e: React.MouseEvent<HTMLDivElement>, data: DataItem) => {
    e.preventDefault();
    props.onSelect?.(data);
  }, [props.onSelect]);

  const style = {
    width: (typeof width === "number" ? width + 'px' : width)
  };

  interface LegendItemProps extends AdvancedLegendItem {
    onMouseEnter: (e: React.MouseEvent<HTMLDivElement>, data: DataItem) => void;
    onMouseLeave: (e: React.MouseEvent<HTMLDivElement>, data: DataItem) => void;
    onSelect: (e: React.MouseEvent<HTMLDivElement>, data: DataItem) => void;
  }

  function LegendItem(props : LegendItemProps) {
    const {
      value,
      color,
      data,
      displayLabel,
      percentage,
      onMouseEnter,
      onMouseLeave,
      onSelect,
    } = props;
    return (
      <div
        tabIndex={-1}
        className="inline-block mr-5 cursor-pointer box-border flex-1"
        onMouseEnter={(e) => onMouseEnter(e, data)}
        onMouseLeave={(e) => onMouseLeave(e, data)}
        onClick={(e) => onSelect(e, data)}
      >
        <div
          className="float-left mr-2 w-1 h-10 border-l-4 border-solid box-border"
          style={{ borderLeftColor: color }}
        />
        <div className="ml-3 -mt-1 text-2xl box-border">
          {valueFormatter(value)}
        </div>
        <div className="ml-3 -mt-2 text-sm box-border opacity-70">
          {displayLabel}
        </div>
        <div className="ml-3 text-2xl box-border opacity-70">
          {percentage.toLocaleString()}%
        </div>
      </div>
    )
  }

  return (
    <div
      className={`inline-block overflow-visible font-light tracking-normal leading-8 text-gray-700 box-border ${props.className || ''}`}
      style={style}
    >
      <div className="tracking-normal text-gray-700 box-border">
        <div className="float-left relative leading-8 text-gray-500 box-border">
          {(totalPosition === 'top') && (
            <>
              <div className="text-4xl text-gray-500 box-border">
                {valueFormatter(roundedTotal)}
              </div>
              <div className="mb-5 text-2xl text-gray-500 box-border">{label}</div>
            </>
          )}
          <div className="w-full text-gray-500 box-border">
            <div className="overflow-x-auto box-border whitespace-no-wrap inline-flex flex-row">
              {(totalPosition === 'left') && (
                <div className="flex-1 mr-4">
                  <div className="text-4xl text-gray-500 box-border">
                    {valueFormatter(roundedTotal)}
                  </div>
                  <div className="mb-5 text-2xl text-gray-500 box-border">{label}</div>
                </div>
              )}
              {legendItems.map((item) => (
                <LegendItem
                  key={item.label}
                  {...item}
                  onMouseEnter={onMouseEnter}
                  onMouseLeave={onMouseLeave}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

