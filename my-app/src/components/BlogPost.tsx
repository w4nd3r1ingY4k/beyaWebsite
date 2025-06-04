import React from "react";
import { BlogPostProps } from "../ComponentTypes";



export const BlogPost: React.FC<BlogPostProps> = ({
  image,
  title,
  description,
  href,
  imageAlt,
}) => (
  <article className="bg-[#FCFCFC] rounded-xl shadow-sm overflow-hidden">
    <img src={image} alt={imageAlt} className="w-full h-48 max-sm:h-22 max-sm:m-5 p-5 object-cover" />
    <div className="p-6">
      <h3 className="text-xl font-semibold text-[#3A3A3A] mb-4">{title}</h3>
      <p className="text-neutral-500 mb-4">{description}</p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-indigo-500 font-semibold uppercase hover:text-indigo-200"
      >
        Read More
      </a>
    </div>
  </article>
);