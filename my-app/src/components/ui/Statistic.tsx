import React from "react";
import { StatisticProps } from "../../ComponentTypes";

export const Statistic: React.FC<StatisticProps> = ({ icon, value, label }) => (
  <div className="bg-[#FCFCFC] rounded-xl shadow-md p-8 text-center">
    <img
      src={icon}
      alt=""
      className="w-32 h-32 mx-auto object-contain"
      aria-hidden="true"
    />
    <div className="text-3xl font-bold text-gray-800 mb-3">{value}</div>
    <div className="text-lg text-gray-600 uppercase">{label}</div>
  </div>
);
