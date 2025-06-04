import React from "react";
import { HeroSectionProps } from "../ComponentTypes";
import { AppDownload } from "../components/ui/AppDownload";

const isGreyedOut = true;

const sectionStyle: React.CSSProperties = {
  position: "relative",
  background: "linear-gradient(to right, #F472B6, #DB2777)", // from-brandPink to-pink-600
  paddingTop: 160,
  paddingBottom: 160,
};

const containerStyle: React.CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
  paddingLeft: 16,
  paddingRight: 16,
};

const flexRowStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column-reverse",
  alignItems: "center",
  justifyContent: "space-between",
};

const textSectionStyle: React.CSSProperties = {
  width: "100%",
  paddingLeft: 16,
  paddingRight: 16,
  marginBottom: 48,
  marginTop: 32,
  boxSizing: "border-box",
};

const whiteBoxStyle: React.CSSProperties = {
  background: "#fff",
  padding: 24,
  borderRadius: 12,
  boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
  marginLeft: 40,
};

const titleStyle: React.CSSProperties = {
  fontSize: 40,
  fontWeight: "bold",
  marginBottom: 24,
  color: "#1a202c",
};

const descStyle: React.CSSProperties = {
  fontSize: 20,
  marginBottom: 32,
  color: "#374151",
};

const wireframeStyle: React.CSSProperties = {
  marginBottom: 16,
};

const downloadTitleStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 600,
  marginBottom: 16,
  color: isGreyedOut ? "#9CA3AF" : "#1a202c",
};

const greyedOutStyle: React.CSSProperties = isGreyedOut
  ? { opacity: 0.5, pointerEvents: "none" }
  : {};

const imageSectionStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  justifyContent: "center",
  paddingLeft: 16,
  paddingRight: 16,
  boxSizing: "border-box",
};

const imgStyle: React.CSSProperties = {
  width: "75%",
  height: "auto",
  maxHeight: 500,
  objectFit: "contain",
  borderRadius: 12,
};

export const HeroSection: React.FC<HeroSectionProps> = ({
  title,
  description,
  appDownload,
  heroImage,
}) => (
  <section style={sectionStyle} id="mission">
    <div style={containerStyle}>
      <div style={flexRowStyle}>
        {/* Text Section with White Box */}
        <div style={textSectionStyle}>
          <div style={whiteBoxStyle}>
            <h1 style={titleStyle}>{title}</h1>
            <p style={descStyle}>{description}</p>
            <p style={wireframeStyle}>
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
              <h2 style={downloadTitleStyle}>Download App Now(Soon)</h2>
              <div style={greyedOutStyle}>
                <AppDownload {...appDownload} />
              </div>
            </div>
          </div>
        </div>
        {/* Image Section */}
        <div style={imageSectionStyle}>
          <img
            src={heroImage}
            alt="App preview"
            style={imgStyle}
          />
        </div>
      </div>
    </div>
  </section>
);
