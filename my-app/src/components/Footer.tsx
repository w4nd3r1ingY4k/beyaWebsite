import React from "react";
import { Link } from "react-router-dom";
import { FooterProps } from "../ComponentTypes";
import { NewsletterForm } from "./NewsletterForm";
import { FaFacebookF, FaTwitter, FaInstagram, FaLinkedinIn, FaEnvelope } from "react-icons/fa";

const styles = {
  footer: {
    background: "#DF1780",
    color: "white",
    paddingTop: 80,
    paddingBottom: 24,
  },
  container: {
    maxWidth: 1200,
    margin: "0 auto",
    paddingLeft: 16,
    paddingRight: 16,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 48,
    marginBottom: 48,
  },
  gridMd: {
    gridTemplateColumns: "repeat(3, 1fr)",
  },
  logo: {
    height: 32,
    marginBottom: 24,
  },
  description: {
    color: "#d1d5db",
    marginBottom: 24,
  },
  emailRow: {
    display: "flex",
    gap: 8,
    marginBottom: 24,
    alignItems: "center",
  },
  emailLink: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "inherit",
    textDecoration: "none",
    transition: "color 0.2s",
  },
  emailLinkHover: {
    color: "#ec4899",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 600,
    marginBottom: 24,
  },
  socialIcons: {
    display: "flex",
    gap: 24,
    fontSize: 24,
  },
  socialIcon: {
    color: "inherit",
    textDecoration: "none",
    transition: "color 0.2s",
  },
  socialIconHover: {
    color: "#ec4899",
  },
  newsletterTitle: {
    fontSize: 20,
    fontWeight: 600,
    marginBottom: 16,
  },
  newsletterDesc: {
    color: "#d1d5db",
    marginBottom: 24,
  },
  privacy: {
    marginTop: 16,
    fontSize: 14,
    textDecoration: "underline",
    color: "inherit",
    transition: "color 0.2s",
  },
  privacyHover: {
    color: "#fff",
  },
  copyright: {
    borderTop: "1px solid #374151",
    paddingTop: 24,
    textAlign: "center" as const,
    color: "#d1d5db",
    marginTop: 24,
  },
};

export const Footer: React.FC<FooterProps> = ({
  logo,
  description,
  socialLinks,
  newsletterTitle,
  newsletterDescription,
  copyrightText,
}) => {
  // Responsive grid: use 3 columns on md+ screens
  const [isMd, setIsMd] = React.useState(window.innerWidth >= 768);
  React.useEffect(() => {
    const onResize = () => setIsMd(window.innerWidth >= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <footer style={styles.footer}>
      <div style={styles.container}>
        <div
          style={{
            ...styles.grid,
            ...(isMd ? styles.gridMd : {}),
          }}
        >
          <div>
            <img src={logo} alt="Company logo" style={styles.logo} />
            <p style={styles.description}>{description}</p>
            <div style={styles.emailRow}>
              <a
                href="mailto:akbar@usebeya.com"
                aria-label="Email"
                style={styles.emailLink}
                onMouseOver={e => (e.currentTarget.style.color = "#ec4899")}
                onMouseOut={e => (e.currentTarget.style.color = "white")}
              >
                <FaEnvelope style={{ width: 20, height: 20 }} />
                <span>akbar@usebeya.com</span>
              </a>
            </div>
          </div>
          <div>
            <h2 style={styles.sectionTitle}>Social Media</h2>
            <div style={styles.socialIcons}>
              <a
                href="https://www.facebook.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                style={styles.socialIcon}
                onMouseOver={e => (e.currentTarget.style.color = "#ec4899")}
                onMouseOut={e => (e.currentTarget.style.color = "white")}
              >
                <FaFacebookF />
              </a>
              <a
                href="https://twitter.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter"
                style={styles.socialIcon}
                onMouseOver={e => (e.currentTarget.style.color = "#ec4899")}
                onMouseOut={e => (e.currentTarget.style.color = "white")}
              >
                <FaTwitter />
              </a>
              <a
                href="https://www.instagram.com/usebeya/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                style={styles.socialIcon}
                onMouseOver={e => (e.currentTarget.style.color = "#ec4899")}
                onMouseOut={e => (e.currentTarget.style.color = "white")}
              >
                <FaInstagram />
              </a>
              <a
                href="https://linkedin.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                style={styles.socialIcon}
                onMouseOver={e => (e.currentTarget.style.color = "#ec4899")}
                onMouseOut={e => (e.currentTarget.style.color = "white")}
              >
                <FaLinkedinIn />
              </a>
            </div>
          </div>
          <div>
            <h2 style={styles.newsletterTitle}>{newsletterTitle}</h2>
            <p style={styles.newsletterDesc}>{newsletterDescription}</p>
            <NewsletterForm />
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <Link
            to="/privacy"
            style={styles.privacy}
            onMouseOver={e => (e.currentTarget.style.color = "#fff")}
            onMouseOut={e => (e.currentTarget.style.color = "inherit")}
          >
            Privacy Policy
          </Link>
        </div>
        <div style={styles.copyright}>{copyrightText}</div>
      </div>
    </footer>
  );
};
