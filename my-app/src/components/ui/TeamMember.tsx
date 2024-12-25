import React from "react";
import { SocialLink } from "../SocialLink";

export const TeamMember: React.FC<{
  image: string;
  name: string;
  role: string;
  description: string;
  socialLinks: {href: string; text: string }[];
}> = ({ image, name, role, description, socialLinks }) => {
  return (
    <div className="text-center p-4">
      <img src={image} alt={name} className="rounded-full mx-auto mb-4 w-40 h-40 object-cover" />
      <h3 className="text-xl font-semibold">{name}</h3>
      <p className="text-gray-500">{role}</p>
      <p className="mt-2">{description}</p>
      <div className="mt-4 flex justify-center space-x-4">
        {socialLinks.map((link, index) => (
          <SocialLink key={index} {...link} />
        ))}
      </div>
    </div>
  );
};