import React from "react";
import { AppDownloadProps } from "../../ComponentTypes";
import "./AppDownload.css";

export const AppDownload: React.FC<AppDownloadProps> = ({
  googlePlayLink,
  appStoreLink,
  googlePlayImage,
  appStoreImage,
  disabled = false,
}) => {
  return (
    <div
      className={`app-download-container ${disabled ? "app-download-disabled" : ""
        }`}
    >
      <a
        href={googlePlayLink}
        aria-label="Download on Google Play"
        className="app-download-link"
      >
        <img
          src={googlePlayImage}
          alt="Get it on Google Play"
          className="app-download-img"
        />
      </a>

      <a
        href={appStoreLink}
        aria-label="Download on App Store"
        className="app-download-link"
      >
        <img
          src={appStoreImage}
          alt="Download on the App Store"
          className="app-download-img"
        />
      </a>
    </div>
  );
};
