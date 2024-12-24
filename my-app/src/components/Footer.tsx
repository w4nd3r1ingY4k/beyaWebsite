import React from "react";
import { FooterProps } from "../ComponentTypes";
import { SocialLink } from "./SocialLink";
import { NavLink } from "./NavLink";
import { NewsletterForm } from "./NewsletterForm";

export const Footer: React.FC<FooterProps> = ({
  logo,
  description,
  socialLinks,
  quickLinks,
  newsletterTitle,
  newsletterDescription,
  copyrightText,
}) => (
  <footer className="bg-gray-800 text-white pt-20 pb-6">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
        <div>
          <img src={logo} alt="Company logo" className="h-8 mb-6" />
          <p className="text-gray-400 mb-6">{description}</p>
          <div className="flex gap-4">
            {socialLinks.map((link, index) => (
              <SocialLink key={index} {...link} />
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-6">Quick Links</h2>
          <nav className="flex flex-col gap-4">
            {quickLinks.map((link, index) => (
              <NavLink key={index} {...link} />
            ))}
          </nav>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-4">{newsletterTitle}</h2>
          <p className="text-gray-400 mb-6">{newsletterDescription}</p>
          <NewsletterForm />
        </div>
      </div>
      <div className="border-t border-gray-700 pt-6 text-center text-gray-400">
        {copyrightText}
      </div>
    </div>
  </footer>
);
