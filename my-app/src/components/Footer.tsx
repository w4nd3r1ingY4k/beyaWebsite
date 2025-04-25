import React from "react";
import { Link } from "react-router-dom";
import { FooterProps } from "../ComponentTypes";
import {
  FaInstagram,
  FaLinkedinIn,
  FaEnvelope,
} from "react-icons/fa";

export const Footer: React.FC<FooterProps> = ({
  logo,
  copyrightText,
}) => (
  <footer className="bg-[#DF1780] text-white py-20">
    <div className="max-w-6xl mx-auto px-4">
      {/* top grid: beta | logo | social */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-8 items-center">
        {/* ← left column */}
        <div className="space-y-4">
          <p className="text-gray-200">Still in beta…</p>
          <a
            href="mailto:akbar@usebeya.com"
            className="flex items-center space-x-2 text-gray-200 hover:text-white transition-colors"
          >
            <FaEnvelope className="w-5 h-5" />
            <span className="text-sm md:text-base">
              akbar@usebeya.com
            </span>
          </a>
        </div>

        {/* ← center column: white logo */}
        <div className="flex justify-center">
          <img
            src={logo}
            alt="Company logo"
            className="h-10 filter invert brightness-0 "
          />
        </div>

        {/* → right column */}
        <div className="space-y-4 flex flex-col items-start md:items-end md:text-right">
          <h2 className="text-xl font-semibold">Social Media</h2>
          <div className="flex items-center space-x-6 text-2xl">
            <a
              href="https://www.instagram.com/usebeya/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="hover:text-white transition-colors"
            >
              <FaInstagram />
            </a>
            <a
              href="https://linkedin.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="hover:text-white transition-colors"
            >
              <FaLinkedinIn />
            </a>
          </div>
        </div>
      </div>

      {/* divider */}
      <hr className="border-white/30 mb-6" />

      {/* bottom bar */}
      <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
        <Link
          to="/privacy"
          className="text-sm underline hover:text-white transition-colors"
        >
          Privacy Policy
        </Link>
        <span className="text-sm text-gray-200">
          {copyrightText}
        </span>
      </div>
    </div>
  </footer>
);
