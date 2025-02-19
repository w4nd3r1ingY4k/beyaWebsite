import { useState, useEffect } from "react";
import Spinner from "./Spinner";

interface ImageWithLoadingProps {
  src?: string;
  alt?: string;
  className?: string;
  loaderClassName?: string;
  imgClassName?: string;
}

const ImageWithLoading: React.FC<ImageWithLoadingProps> = ({ 
  src, 
  alt, 
  className = "", 
  loaderClassName = "bg-pink", 
  imgClassName = "object-cover w-full h-full"
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [delayOver, setDelayOver] = useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => setDelayOver(true), 2000); // Keep spinner for 2 seconds
    return () => clearTimeout(timer);
  }, []);

  const handleImageLoad = () => {
    if (delayOver) {
      setLoading(false);
    }
  };

  return (
    <div className={`${className} relative`}>
      {/* Loading Animation */}
      {(loading || !delayOver) && (
        <div className={`absolute inset-0 flex items-center justify-center ${loaderClassName}`}>
          <Spinner />
        </div>
      )}

      {/* Image */}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoading(false)}
        className={className}
      />
    </div>
  );
};

export default ImageWithLoading;
