import * as React from "react";
import { FeatureColumnProps } from "../../../ComponentTypes";
import { Feature } from "../../../ComponentTypes";
export function FeatureColumn({ position, features }: FeatureColumnProps) {
  const baseColumnClasses = "flex flex-col w-[33%] max-md:w-full max-md:px-0";  // Ensure full width and reset padding on mobile
  
  const columnClasses =
    position === "center"
      ? `${baseColumnClasses} ml-5 max-md:ml-0`  // Centered on mobile
      : position === "left"
      ? `${baseColumnClasses} mr-auto pr-20 max-md:pr-0`  // Remove padding on mobile
      : `${baseColumnClasses} ml-auto pl-20 max-md:pl-0`; // Remove padding on mobile
  
  const getFeatureContent = (feature: Feature, index: number) => {
    if (Array.isArray(feature.centerImage)) {
      return (
        <div className="flex flex-wrap justify-center gap-5 mt-16 w-full">
          {feature.centerImage.map((image, imgIndex) => (
            <img
              key={imgIndex}
              loading="lazy"
              src={image}
              className="object-contain self-stretch w-[45%] aspect-[0.46] rounded-[40px] shadow-[40px_40px_100px_rgba(24,48,63,0.5)] max-md:w-full"
              alt={`Feature preview ${imgIndex}`}
            />
          ))}
        </div>
      );
    }
    
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
      <div className="flex flex-col items-center text-center w-full">
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
    left: "flex flex-col self-stretch my-auto text-2xl font-semibold text-right text-white max-md:mt-10 max-md:items-center max-md:text-center",
    center:
      "flex flex-col grow items-center text-base font-semibold text-center text-white max-md:mt-10",
    right:
      "flex flex-col self-stretch my-auto text-2xl font-semibold text-white max-md:mt-10 max-md:items-center max-md:text-center",
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
