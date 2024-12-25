import * as React from "react";
import { FeatureColumnProps } from "../../ComponentTypes";
import { Feature } from "../../ComponentTypes";

export function FeatureColumn({ position, features }: FeatureColumnProps) {
  const baseColumnClasses = "flex flex-col w-[33%] max-md:ml-0 max-md:w-full";
  const columnClasses =
    position === "center"
      ? `${baseColumnClasses} ml-5`
      : position === "left"
      ? `${baseColumnClasses} mr-auto pr-20`  // Increase right padding for more left shift
      : `${baseColumnClasses} ml-auto pl-20`; // Increase left padding for more right shift
  
  const getFeatureContent = (feature: Feature, index: number) => {
    if (feature.centerImage) {
      return (
        <img
          loading="lazy"
          src={feature.centerImage}
          className="object-contain self-stretch mt-16 w-full aspect-[0.46] rounded-[40px] shadow-[40px_40px_100px_rgba(24,48,63,0.5)] max-md:mt-10"
          alt="Feature preview"
        />
      );
    }
  
    return (
      <div className="flex flex-col items-center text-center">
        <img
          loading="lazy"
          src={feature.icon}
          className={`object-contain aspect-square w-[60px] mx-auto ${
            index > 0 ? "mt-40 max-md:mt-10" : ""
          }`}
          alt={feature.title}
        />
        <div className="mt-6 uppercase">{feature.title}</div>
        <div className="mt-4 text-base leading-6">{feature.description}</div>
      </div>
    );
  };  

  const contentClasses = {
    left: "flex flex-col self-stretch my-auto text-2xl font-semibold text-right text-white max-md:mt-10",
    center:
      "flex flex-col grow items-center text-base font-semibold text-center text-white max-md:mt-10",
    right:
      "flex flex-col self-stretch my-auto text-2xl font-semibold text-white max-md:mt-10",
  };

  return (
    <div className={columnClasses}>
      <div className={contentClasses[position]}>
        {features.map((feature, index) => (
          <React.Fragment key={index}>
            {getFeatureContent(feature, index)}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
