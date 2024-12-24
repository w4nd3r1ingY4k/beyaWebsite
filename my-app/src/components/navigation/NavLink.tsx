import * as React from "react";
import { NavLinkProps } from "../../ComponentTypes";

export const NavLink: React.FC<NavLinkProps> = ({ text, isActive = false }) => {
  const baseStyles = "text-xl font-semibold text-gray-800 uppercase";
  const activeStyles = "text-indigo-600 underline decoration-auto decoration-solid underline-offset-auto";
  
  return (
    <div className={`${baseStyles} ${isActive ? activeStyles : ""}`}>
      {text}
    </div>
  );
};