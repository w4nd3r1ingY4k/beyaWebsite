import React from "react";
import { SocialLink } from "../SocialLink";
import "./TeamMember.css";

interface TeamMemberProps {
  image: string;
  name: string;
  school: string;
  major: string;
  role: string;
  socialLinks: { href: string; text: string }[];
}

export const TeamMember: React.FC<TeamMemberProps> = ({
  image,
  name,
  school,
  major,
  role,
  socialLinks,
}) => {
  return (
    <div className="team-member">
      <img
        src={image}
        alt={name}
        className="team-member-image"
      />
      <h3 className="team-member-name">{name}</h3>
      <p className="team-member-school">{school}</p>
      <p className="team-member-major">{major}</p>
      <p className="team-member-role">{role}</p>
      <div className="team-member-socials">
        {socialLinks.map((link, index) => (
          <SocialLink key={index} {...link} />
        ))}
      </div>
    </div>
  );
};
