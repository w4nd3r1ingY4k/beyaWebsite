import * as React from "react";
import { FeatureColumnProps } from "../../../ComponentTypes";
import { Feature } from "../../../ComponentTypes";

export function FeatureColumn({ position, features }: FeatureColumnProps) {
  const baseColumnClasses = "flex flex-col h-full w-[33%] max-md:w-full max-md:px-0";  // Stretch columns vertically
  
  const columnClasses =
    position === "center"
      ? `${baseColumnClasses} justify-center items-center max-md:ml-0`
      : position === "left"
      ? `${baseColumnClasses} justify-start pr-10 max-md:pr-0`  // Reduced padding for less scroll
      : `${baseColumnClasses} justify-start pl-10 max-md:pl-0`;
  
  const getFeatureContent = (feature: Feature, index: number) => {
    if (feature.centerImage) {
      return (
        <div className="flex justify-center items-center w-full h-full">
          <img
            loading="lazy"
            src={feature.centerImage}
            className="object-contain w-[70%] max-w-[450px] max-h-[700px] rounded-[30px] shadow-lg"
            alt="Feature preview"
          />
        </div>
      );
    }
  
    return (
      <div className="flex flex-col items-center justify-center text-center w-full">
        <img
          loading="lazy"
          src={feature.icon}
          className={`object-contain aspect-square w-[40px] ${
            index > 0 ? "mt-10" : "mt-5"
          }`}
          alt={feature.title}
        />
        <div className="mt-4 uppercase text-sm font-medium">{feature.title}</div>
        <div className="mt-3 mb-5 text-sm leading-5 max-w-[300px]">{feature.description}</div>
      </div>
    );
  };  

  const contentClasses = {
    left: "flex flex-col justify-start items-end text-white h-full",
    center: "flex flex-col justify-center items-center text-white h-full",
    right: "flex flex-col justify-start items-start text-white h-full",
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
