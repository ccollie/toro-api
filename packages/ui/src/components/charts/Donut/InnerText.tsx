import React from 'react';

function SubText(str: string, size: number, className: string) {
  const words = str.split(' ');
  const style = {
    fontSize: '50%'
  };
  let dy = '15%';
  return words.map(w => {
    const c = [];
    c.push(
      <tspan
        className={`${className}-subtext`}
        key={w}
        style={style}
        x={size / 2}
        dy={dy}
      >
        {w}
      </tspan>
    );
    dy = '10%';
    return c;
  });
}

interface InnerTextDataItem {
  name: string;
  value: number;
}

interface InnerTextProps {
  title: string;
  className: string;
  size: number;
  data: Array<InnerTextDataItem>;
  active: number;
}

export default function InnerText(props: InnerTextProps) {
  const { title, className, size, data, active } = props;
  const { length } = data;
  const total = data.reduce((sum, currItem) => sum + currItem.value, 0);
  const newData = data.map(d => {
    const value = (d.value * 100) / total;
    return { name: d.name, value, formatted: `${Math.round(value)}%` };
  });
  newData[-1] = {
    name: title,
    value: length,
    formatted: `${length}`
  };

  const style = {
    fontSize: `${size / 5}px`
  };
  const style1 = {
    fontSize: '90%'
  };
  const subText = SubText(newData[active % length].name, size, className);
  return (
    <text
      className={className}
      style={style}
      x={size / 2}
      y={size / 2}
      textAnchor="middle"
      dominantBaseline="ideographic"
    >
      <tspan className={`${className}-value`} style={style1} x={size / 2}>
        {newData[active % length].formatted}
      </tspan>
      {subText}
    </text>
  );
}
