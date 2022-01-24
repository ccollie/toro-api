import React from "react";
import { ArcDataItem, OnHoverCallback } from './types';
import Arcs, { DEFAULT_COLORS } from "./Arcs";
import InnerText from "./InnerText";

interface DonutProps {
  title?: string;
  size?: number;
  className?: string;
  data: ArcDataItem[];
  active?: number;
  onHover?: OnHoverCallback;
  colors?: string[],
  innerRadius?: number;
  outerRadius?: number;
  activeOffset?: number;
}


export default function Donut(props: DonutProps) {
  const {
    title = "Values",
    size = 500,
    className = "donut-chart",
    data,
    colors = DEFAULT_COLORS,
    innerRadius = 0.65,
    outerRadius = 0.95,
    activeOffset = 0.05,
    onHover,
    active = -1
  } = props;
  const newData =
    data ? data : [{ name: "invalid-values", value: 100 }];
  return (
    <svg
      className={className}
      style={{ width: `${size}px`, height: `${size}px` }}
      viewBox={`0 0 ${size} ${size}`}
    >
      <Arcs
        size={size}
        data={newData}
        active={active}
        onHover={onHover}
        className={`${className}-arcs`}
        colors={colors}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        activeOffset={activeOffset}
      />
      <InnerText
        title={title}
        size={size}
        className={`${className}-text`}
        data={newData}
        active={active}
      />
    </svg>
  );
}

