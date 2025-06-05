// src/components/Footer.tsx

import React from "react";
import { Link } from "react-router-dom";
import { FooterProps } from "../ComponentTypes";
import { NewsletterForm } from "./NewsletterForm";
import {
  FaInstagram,
  FaLinkedinIn,
  FaEnvelope,
} from "react-icons/fa";
import "./Footer.css";

export const Footer: React.FC<FooterProps> = ({
  logo,
  description,
  emailLink,
  newsletterTitle,
  newsletterDescription,
  copyrightText,
}) => {
  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Grid will automatically switch between one column and three columns via media query */}
        <div className="footer-grid">
          {/* Column 1: Logo, description, email */}
          <div>
            <img src={logo} alt="Company logo" className="footer-logo" />
            <p className="footer-description">{description}</p>
            <div className="footer-email-row">
              <a
                href={`mailto:${emailLink}`}
                aria-label="Email"
                className="footer-email-link"
              >
                <FaEnvelope style={{ width: 20, height: 20 }} />
                <span>{emailLink}</span>
              </a>
            </div>
          </div>

          {/* Column 2: Social Media */}
          <div>
            <h2 className="footer-section-title">Social Media</h2>
            <div className="footer-social-icons">
              <a
                href="https://www.instagram.com/usebeya/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="footer-social-icon"
              >
                <FaInstagram />
              </a>
              <a
                href="https://linkedin.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="footer-social-icon"
              >
                <FaLinkedinIn />
              </a>
            </div>
          </div>

          {/* Column 3: Newsletter */}
          <div>
            <h2 className="footer-newsletter-title">{newsletterTitle}</h2>
            <p className="footer-newsletter-desc">
              {newsletterDescription}
            </p>
            <NewsletterForm />
          </div>
        </div>

        {/* Privacy Policy link */}
        <div style={{ marginTop: 16 }}>
          <Link to="/privacy" className="footer-privacy">
            Privacy Policy
          </Link>
        </div>

        {/* Copyright */}
        <div className="footer-copyright">
          {copyrightText}
        </div>
      </div>
    </footer>
  );
};
