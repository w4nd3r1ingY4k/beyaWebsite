import React from "react";
import { BlogPostProps } from "../ComponentTypes";

const articleStyle: React.CSSProperties = {
  background: "#FCFCFC",
  borderRadius: "1rem",
  boxShadow: "0 1px 2px 0 rgba(16, 24, 40, 0.05)",
  overflow: "hidden",
};

const imgStyle: React.CSSProperties = {
  width: "100%",
  height: "12rem",
  objectFit: "cover",
  padding: "1.25rem",
};

const divStyle: React.CSSProperties = {
  padding: "1.5rem",
};

const titleStyle: React.CSSProperties = {
  fontSize: "1.25rem",
  fontWeight: 600,
  color: "#3A3A3A",
  marginBottom: "1rem",
};

const descStyle: React.CSSProperties = {
  color: "#737373",
  marginBottom: "1rem",
};

const linkStyle: React.CSSProperties = {
  color: "#6366F1",
  fontWeight: 600,
  textTransform: "uppercase",
  textDecoration: "none",
  transition: "color 0.2s",
};

export const BlogPost: React.FC<BlogPostProps> = ({
  image,
  title,
  description,
  href,
  imageAlt,
}) => (
  <article style={articleStyle}>
    <img src={image} alt={imageAlt} style={imgStyle} />
    <div style={divStyle}>
      <h3 style={titleStyle}>{title}</h3>
      <p style={descStyle}>{description}</p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={linkStyle}
        onMouseOver={e => (e.currentTarget.style.color = "#C7D2FE")}
        onMouseOut={e => (e.currentTarget.style.color = "#6366F1")}
      >
        Read More
      </a>
    </div>
  </article>
);