import React, { useCallback } from "react";
import { ArcDataItem } from './types';
import ArcPath from "./ArcPath";

export const DEFAULT_COLORS = [
  "rgb(51, 102, 204)",
  "rgb(220, 57, 18)",
  "rgb(255, 153, 0)",
  "rgb(16, 150, 24)",
  "rgb(153, 0, 153)"
];

function calculateTotal(items: ArcDataItem[]) {
  return items.reduce((sum, currItem) => sum + currItem.value, 0);
}

interface ArcsProps {
  size?: number;
  className?: string;
  data: ArcDataItem[];
  active?: number;
  onHover?: (index: number, item: ArcDataItem) => void;
  colors?: string[];
  innerRadius?: number;
  outerRadius?: number;
  activeOffset?: number;
}


export default function Arcs(props: ArcsProps) {
  const {
    size = 500,
    data,
    active = -1,
    onHover,
    className = "donut-chart-arcs",
    colors = DEFAULT_COLORS,
    innerRadius = 0.65,
    outerRadius = 0.95,
    activeOffset = 0.05
  } = props;
  let angle = 270;
  const total = calculateTotal(data);

  const handleHover = useCallback(function (index: number) {
    onHover && onHover(index, data[index]);
  }, [onHover]);

  return (
    <g className={className}>
      {data.map((item, index) => {
        const { value } = item;
        const fill = colors[index % colors.length];
        const arcPath = (
          <ArcPath
            className={`${className}-arcpath-${index}`}
            size={size}
            item={item}
            index={index}
            key={item.name}
            innerRadius={innerRadius}
            outerRadius={
              index === active ? outerRadius + activeOffset : outerRadius
            }
            fill={fill}
            angle={angle}
            total={total}
            onMouseEnter={handleHover}
          />
        );
        angle += (value / total) * 360;
        return arcPath;
      })}
    </g>
  );
}
