import React from "react";
import { SocialLink } from "../SocialLink";

export const TeamMember: React.FC<{
  image: string;
  name: string;
  school: string;
  major: string;
  role: string;
  socialLinks: {href: string; text: string }[];
}> = ({ image, name,school, major, role, socialLinks }) => {
  return (
    <div className="text-center p-4">
      <img src={image} alt={name} className="rounded-full mx-auto mb-4 w-40 h-40 object-cover" />
      <h3 className="text-xl font-semibold text-[#3A3A3A]">{name}</h3>
      <p className="text-sm text-gray-500">{school}</p>
      <p className="text-sm text-gray-500">{major}</p>

      <p className="font-semibold text-[#3A3A3A]">{role}</p>
      <div className="mt-2 flex justify-center space-x-4">
        {socialLinks.map((link, index) => (
          <SocialLink key={index} {...link} />
        ))}
      </div>
    </div>
  );
};
