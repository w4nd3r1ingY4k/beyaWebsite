import React from "react";
import { StatisticProps } from "../ComponentTypes";

export const Statistic: React.FC<StatisticProps> = ({ icon, value, label }) => (
  <div className="bg-white rounded-xl shadow-sm p-8 text-center">
    <img
      src={icon}
      alt=""
      className="w-10 h-10 mx-auto mb-4"
      aria-hidden="true"
    />
    <div className="text-2xl font-bold text-gray-800 mb-2">{value}</div>
    <div className="text-xl text-gray-600 uppercase">{label}</div>
  </div>
);
