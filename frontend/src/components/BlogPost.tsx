import React from "react";
import { BlogPostProps } from "../types/componentTypes";
import "./BlogPost.css";

export const BlogPost: React.FC<BlogPostProps> = ({
  image,
  title,
  description,
  href,
  imageAlt,
}) => (
  <article className="blog-post">
    <img 
      src={image} 
      alt={imageAlt} 
      className="blog-post-image" 
    />
    <div className="blog-post-content">
      <h3 className="blog-post-title">
        {title}
      </h3>
      <p className="blog-post-description">
        {description}
      </p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="blog-post-link"
      >
        Read More
      </a>
    </div>
  </article>
);