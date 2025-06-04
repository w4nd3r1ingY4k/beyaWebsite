import React from "react";
import { StatisticProps } from "../ComponentTypes";

export const Statistic: React.FC<StatisticProps> = ({ icon, value, label }) => (
  <div
    style={{
      background: "#FCFCFC",
      borderRadius: "0.75rem",
      boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
      padding: "2rem",
      textAlign: "center",
    }}
  >
    <img
      src={icon}
      alt=""
      style={{
        width: "8rem",
        height: "8rem",
        margin: "0 auto",
        objectFit: "contain",
        display: "block",
      }}
      aria-hidden="true"
    />
    <div
      style={{
        fontSize: "1.875rem",
        fontWeight: "bold",
        color: "#2D3748",
        marginBottom: "0.75rem",
      }}
    >
      {value}
    </div>
    <div
      style={{
        fontSize: "1.125rem",
        color: "#718096",
        textTransform: "uppercase",
      }}
    >
      {label}
    </div>
  </div>
);