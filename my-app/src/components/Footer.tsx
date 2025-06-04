import React from "react";
import { Link } from "react-router-dom";
import { FooterProps } from "../ComponentTypes";
import { NewsletterForm } from "./NewsletterForm";
import { FaFacebookF, FaTwitter, FaInstagram, FaLinkedinIn, FaEnvelope } from "react-icons/fa";

export const Footer: React.FC<FooterProps> = ({
  logo,
  description,
  socialLinks,
  newsletterTitle,
  newsletterDescription,
  copyrightText,
}) => (
  <footer className="bg-[#DF1780] text-white pt-20 pb-6">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
        <div>
          <img src={logo} alt="Company logo" className="h-8 mb-6" />
          <p className="text-gray-400 mb-6">{description}</p>

          {/* Email Link */}
          <div className="flex gap-2 mb-6 items-center">
            <a
              href="mailto:akbar@usebeya.com"
              aria-label="Email"
              className="flex items-center gap-2 hover:text-pink-500"
            >
              <FaEnvelope className="w-5 h-5" />
              <span>akbar@usebeya.com</span>
            </a>
          </div>
        </div>

        {/* Quick Links Section */}
        <div>
          <h2 className="text-xl font-semibold mb-6">Social Media</h2>
          {/* Social Media Icons */}
          <div className="flex gap-6 text-2xl">
            <a
              href="https://www.facebook.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="hover:text-pink-500"
            >
              <FaFacebookF />
            </a>
            <a
              href="https://twitter.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Twitter"
              className="hover:text-pink-500"
            >
              <FaTwitter />
            </a>
            <a
              href="https://www.instagram.com/usebeya/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="hover:text-pink-500"
            >
              <FaInstagram />
            </a>
            <a
              href="https://linkedin.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="hover:text-pink-500"
            >
              <FaLinkedinIn />
            </a>
          </div>
        </div>

        {/* Newsletter Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">{newsletterTitle}</h2>
          <p className="text-gray-400 mb-6">{newsletterDescription}</p>
          <NewsletterForm />
        </div>
      </div>
      <div className="mt-4">
            <Link
              to="/privacy"
              className="text-sm underline hover:text-white transition-colors duration-200"
            >
              Privacy Policy
            </Link>
          </div>

      <div className="border-t border-gray-700 pt-6 text-center text-gray-400">
        {copyrightText}
      </div>
    </div>
  </footer>
);
