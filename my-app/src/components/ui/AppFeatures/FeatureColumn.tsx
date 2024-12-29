import * as React from "react";
import { FeatureColumnProps, Feature } from "../../../ComponentTypes";

export function FeatureColumn({ position, features }: FeatureColumnProps) {
  const baseColumnClasses = "flex flex-col h-full w-full px-0 m-0";

  const columnClasses =
    position === "center"
      ? `${baseColumnClasses} justify-center items-center max-md:ml-0`
      : position === "left"
      ? `${baseColumnClasses} justify-start p-0`
      : `${baseColumnClasses} justify-start p-0`;

  // Track the current image index for each feature
  const [imageIndexList, setImageIndexList] = React.useState(
    () => features.map(() => 0)
  );

  // Track whether each feature is currently flipping (for the 3D animation)
  const [isFlipping, setIsFlipping] = React.useState(
    () => features.map(() => false)
  );

  const handleImageClick = (featureIndex: number) => {
    const feature = features[featureIndex];
    if (!feature || !Array.isArray(feature.centerImage)) return;

    // Start the flip animation
    setIsFlipping((prev) => {
      const newFlips = [...prev];
      newFlips[featureIndex] = true;
      return newFlips;
    });

    // After the flip animation duration, switch the image, then reset flipping
    setTimeout(() => {
      setImageIndexList((prevIndices) => {
        const newIndices = [...prevIndices];
        const totalImages = feature.centerImage!.length;
        newIndices[featureIndex] =
          (prevIndices[featureIndex] + 1) % totalImages;
        return newIndices;
      });

      setIsFlipping((prev) => {
        const newFlips = [...prev];
        newFlips[featureIndex] = false;
        return newFlips;
      });
    }, 600); // Matches the CSS transition duration
  };

  const getFeatureContent = (feature: Feature, index: number) => {
    const hasMultipleImages =
      Array.isArray(feature.centerImage) && feature.centerImage.length > 1;

    if (feature.centerImage) {
      return (
        <div
          className="relative w-full h-full flex justify-center items-center"
          style={{ perspective: "1200px" }}  // Increased perspective for better depth
        >
          <div
            className={`w-full h-auto flex justify-center ${
              hasMultipleImages ? 'cursor-pointer' : 'cursor-default'
            }`}
            style={{
              transition: "transform 0.6s",
              transformStyle: "preserve-3d",
              transform: isFlipping[index] ? "rotateY(90deg)" : "none",
              transformOrigin: "center",  // Ensures it flips around its center
            }}
            onClick={() => hasMultipleImages && handleImageClick(index)}
          >
            <img
              loading="lazy"
              src={feature.centerImage[imageIndexList[index]]}
              className="object-contain w-[70%] max-w-[450px] max-h-[700px] rounded-[30px] shadow-lg"
              alt="Feature preview"
            />
          </div>

          {/* Optional label prompting the user to click */}
          {hasMultipleImages && !isFlipping[index] && (
            <div className="absolute bottom-4 text-white text-sm bg-black/50 px-3 py-1 rounded-md">
              Click to flip
            </div>
          )}
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
        <div className="mt-3 mb-5 text-sm leading-5 max-w-[300px]">
          {feature.description}
        </div>
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
