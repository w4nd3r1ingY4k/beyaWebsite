import React from "react";
import { NavLinkProps } from "../ComponentTypes";

export const NavLink: React.FC<NavLinkProps> = ({ href, text, isActive }) => (
  <a
    href={href}
    className={`text-xl font-semibold uppercase transition-colors
      ${
        isActive
          ? "text-indigo-600 underline"
          : "text-gray-800 hover:text-indigo-600"
      }`}
  >
    {text}
  </a>
);
