import React from "react";
import { SocialLink } from "./SocialLink";

export const TeamMember: React.FC<{
  image: string;
  name: string;
  school: string;
  major: string;
  role: string;
  socialLinks: { href: string; text: string }[];
}> = ({ image, name, school, major, role, socialLinks }) => {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "1rem",
      }}
    >
      <img
        src={image}
        alt={name}
        style={{
          borderRadius: "50%",
          display: "block",
          margin: "0 auto 1rem auto",
          width: "10rem",
          height: "10rem",
          objectFit: "cover",
        }}
      />
      <h3
        style={{
          fontSize: "1.25rem",
          fontWeight: 600,
          color: "#3A3A3A",
        }}
      >
        {name}
      </h3>
      <p style={{ fontSize: "0.875rem", color: "#6B7280" }}>{school}</p>
      <p style={{ fontSize: "0.875rem", color: "#6B7280" }}>{major}</p>
      <p style={{ fontWeight: 600, color: "#3A3A3A" }}>{role}</p>
      <div
        style={{
          marginTop: "0.5rem",
          display: "flex",
          justifyContent: "center",
          gap: "1rem",
        }}
      >
        {socialLinks.map((link, index) => (
          <SocialLink key={index} {...link} />
        ))}
      </div>
    </div>
  );
};