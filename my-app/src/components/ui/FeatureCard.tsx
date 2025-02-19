import React from "react";
import { FeatureCardProps } from "../../ComponentTypes";
import ImageWithLoading from "../ImageLoading";

export const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
}) => (
  <div className="bg-white rounded-xl shadow-sm p-8 transition-transform hover:scale-105">
    <ImageWithLoading src={icon} alt="" className="w-12 h-12 mb-6" aria-hidden="true" />
    <h3 className="text-xl font-semibold text-gray-800 uppercase mb-4">
      {title}
    </h3>
    <p className="text-neutral-500 leading-relaxed">{description}</p>
  </div>
);
