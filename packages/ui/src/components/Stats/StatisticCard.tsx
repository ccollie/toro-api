import React from 'react';

interface StatisticCardProps {}
export const StatisticCard: React.FC<StatisticCardProps> = (props) => {
  const { children } = props;
  return (
    <>
      <div className="w-full flex items-center justify-center">
        <div className="py-4 px-6 sm:py-6 md:py-8 bg-white shadow rounded-lg">
          {children}
        </div>
      </div>
    </>
  );
};

export default StatisticCard;
