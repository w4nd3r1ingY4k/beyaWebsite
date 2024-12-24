import React from "react";
import { SocialLinkProps } from "../ComponentTypes";

export const SocialLink: React.FC<SocialLinkProps> = ({
  icon,
  text,
  href,
  ariaLabel,
}) => (
  <a
    href={href}
    className="flex items-center gap-2 text-white hover:text-gray-200 transition-colors"
    aria-label={ariaLabel}
  >
    <img src={icon} alt="" className="w-4 h-4" aria-hidden="true" />
    <span>{text}</span>
  </a>
);
