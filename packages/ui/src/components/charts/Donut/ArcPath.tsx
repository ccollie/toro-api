import React from "react";
import { ArcDataItem } from './types';
import path from "./path";

interface ArcPathProps {
  size: number;
  angle: number;
  total: number;
  fill?: string;
  item: ArcDataItem;
  index?: number;
  className?: string;
  onMouseEnter?: (index: number) => void;
  innerRadius: number,
  outerRadius: number
}

const DEFAULT_CLASS_NAME = "donut-chart-arcpath-0";
const DEFAULT_FILL = "#ff0000";

export default function ArcPath(props: ArcPathProps) {
  const {
    size,
    angle,
    total,
    fill = DEFAULT_FILL,
    item,
    index = 0,
    className = DEFAULT_CLASS_NAME,
    innerRadius,
    outerRadius,
    onMouseEnter = () => { console.log("hover", index)}
  } = props;
  const { value } = item;
  const activeAngle =
    Number.isNaN(value / total) || total / value === 1
      ? 359.99
      : (value / total) * 360;
  const d = path(activeAngle, angle, size, innerRadius, outerRadius);
  return (
    <path
      onMouseEnter={() => onMouseEnter(index)}
      onMouseLeave={() => onMouseEnter(-1)}
      className={className}
      d={d}
      fill={fill}
    />
  );
}
