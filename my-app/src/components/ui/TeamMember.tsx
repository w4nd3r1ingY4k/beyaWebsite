import React from "react";
import { TeamMemberProps } from "../../ComponentTypes";
import { SocialLink } from "../SocialLink";

export const TeamMember: React.FC<TeamMemberProps> = ({
  image,
  name,
  role,
  description,
  socialLinks,
}) => (
  <div className="bg-white rounded-xl shadow-sm p-8 text-center">
    <img
      src={image}
      alt={name}
      className="w-32 h-32 rounded-full mx-auto mb-6 object-cover"
    />
    <h3 className="text-2xl font-bold text-gray-800 mb-2">{name}</h3>
    <p className="text-xl text-indigo-600 mb-4">{role}</p>
    <p className="text-neutral-500 mb-6">{description}</p>
    <div className="flex justify-center gap-4">
      {socialLinks.map((link, index) => (
        <SocialLink key={index} {...link} />
      ))}
    </div>
  </div>
);
