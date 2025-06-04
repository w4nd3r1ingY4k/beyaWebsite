import React from "react";
import { FeatureCardProps } from "../../ComponentTypes";

export const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
}) => (
  <div
    style={{
      background: "#FCFCFC",
      borderRadius: "0.75rem",
      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      padding: "2rem",
      transition: "transform 0.2s",
      willChange: "transform",
      cursor: "pointer",
    }}
    onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.05)")}
    onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
  >
    <img
      src={icon}
      alt=""
      style={{ width: "3rem", height: "3rem", marginBottom: "1.5rem" }}
      aria-hidden="true"
    />
    <h3
      style={{
        fontSize: "1.25rem",
        fontWeight: 600,
        color: "#1F2937",
        textTransform: "uppercase",
        marginBottom: "1rem",
      }}
    >
      {title}
    </h3>
    <p style={{ color: "#6B7280", lineHeight: 1.6 }}>{description}</p>
  </div>
);
