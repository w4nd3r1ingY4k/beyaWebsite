import React from "react";
import { HeroSectionProps } from "../ComponentTypes";
import { AppDownload } from "../components/ui/AppDownload";
import "./HeroSection.css";

const isGreyedOut = true;

export const HeroSection: React.FC<HeroSectionProps> = ({
  title,
  description,
  appDownload,
  heroImage,
}) => {
  return (
    <section className="hero-section" id="mission">
      <div className="hero-container">
        <div className="hero-flex-row">
          {/* Text Section with White Box */}
          <div className="hero-text-section">
            <div className="hero-white-box">
              <h1 className="hero-title">{title}</h1>
              <p className="hero-desc">{description}</p>
              <p className="hero-wireframe">
                <b>
                  <a
                    href="https://www.figma.com/proto/qO9vcMMjS1UxcYTYAbOEIQ/UI?page-id=578%3A195&node-id=578-398&viewport=838%2C453%2C0.14&t=rt5qp9FqxhzAbZPG-1&scaling=scale-down&content-scaling=fixed&starting-point-node-id=578%3A398"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Click here for a wireframe demo!
                  </a>
                </b>
              </p>
              <div style={{ marginBottom: 32 }}>
                <h2
                  className="hero-download-title"
                  style={{
                    /* override color if greyed out */
                    color: isGreyedOut ? "#9CA3AF" : "#1a202c",
                  }}
                >
                  Download App Now (Soon)
                </h2>
                <div className={isGreyedOut ? "hero-greyed-out" : ""}>
                  <AppDownload {...appDownload} />
                </div>
              </div>
            </div>
          </div>

          {/* Image Section */}
          <div className="hero-image-section">
            <img src={heroImage} alt="App preview" className="hero-img" />
          </div>
        </div>
      </div>
    </section>
  );
};
