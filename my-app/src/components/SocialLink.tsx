import React from "react";
import { SocialLinkProps } from "../ComponentTypes";
import { FaLinkedin } from "react-icons/fa";

export const SocialLink: React.FC<SocialLinkProps> = ({
  text,
  href,
  ariaLabel,
}) => (
  <a
    href={href}
    className="flex items-center text-blue-500 hover:text-brandPink transition-colors"
    aria-label={ariaLabel}
    target="_blank"
    rel="noopener noreferrer"
  >
    {href &&
        <FaLinkedin className="w-5 h-5 text-blue-500 hover:text-pink-500 transition-colors" />
    }
    <span>{text}</span>
  </a>
);