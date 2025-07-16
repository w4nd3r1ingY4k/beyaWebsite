import React from "react";
import { AppDownloadProps } from "../../types/componentTypes";

export const AppDownload: React.FC<AppDownloadProps> = ({
  googlePlayLink,
  appStoreLink,
  googlePlayImage,
  appStoreImage,
  disabled = false,
}) => (
  <div
    className={`flex gap-4 items-center ${
      disabled ? 'opacity-50 pointer-events-none cursor-not-allowed' : ''
    }`}
  >
    <a
      href={googlePlayLink}
      className="transition-transform hover:scale-105 flex items-center"
      aria-label="Download on Google Play"
    >
      <img
        src={googlePlayImage}
        alt="Get it on Google Play"
        className="h-12 w-auto object-contain"
      />
    </a>
    <a
      href={appStoreLink}
      className="transition-transform hover:scale-105 flex items-center"
      aria-label="Download on App Store"
    >
      <img
        src={appStoreImage}
        alt="Download on the App Store"
        className="h-12 w-auto object-contain mb-[0.25em]"
      />
    </a>
  </div>
);