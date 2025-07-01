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
}) => {
  const systemFontStack = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'";
  
  // Responsive grid: use 3 columns on md+ screens
  const [isMd, setIsMd] = React.useState(
    typeof window !== 'undefined' ? window.innerWidth >= 768 : false
  );
  
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const onResize = () => setIsMd(window.innerWidth >= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const styles = {
    footer: {
      background: "linear-gradient(135deg,rgb(0, 0, 0) 0%,rgb(39, 17, 31) 100%)",
      color: "white",
      paddingTop: "6rem",
      paddingBottom: "2rem",
      position: "relative" as const,
      overflow: "hidden",
      fontFamily: systemFontStack,
    },
    container: {
      maxWidth: "1280px",
      margin: "0 auto",
      paddingLeft: "2rem",
      paddingRight: "2rem",
      position: "relative" as const,
      zIndex: 10,
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "1fr",
      gap: "3rem",
      marginBottom: "4rem",
    },
    gridMd: {
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "4rem",
    },
    logo: {
      height: "2.5rem",
      marginBottom: "1.5rem",
      filter: "brightness(0) invert(1)", // Makes logo white if it's dark
    },
    description: {
      color: "#D1D5DB",
      marginBottom: "2rem",
      fontSize: "1rem",
      lineHeight: 1.6,
      maxWidth: "320px",
    },
    emailRow: {
      display: "flex",
      gap: "0.75rem",
      marginBottom: "1.5rem",
      alignItems: "center",
    },
    emailLink: {
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      color: "inherit",
      textDecoration: "none",
      transition: "all 0.3s ease",
      padding: "0.75rem 1rem",
      borderRadius: "0.75rem",
      background: "rgba(255, 255, 255, 0.05)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      backdropFilter: "blur(10px)",
      WebkitBackdropFilter: "blur(10px)",
      fontSize: "0.95rem",
    },
    sectionTitle: {
      fontSize: "1.375rem",
      fontWeight: 600,
      marginBottom: "2rem",
      color: "#FFFFFF",
      letterSpacing: "-0.01em",
    },
    socialIcons: {
      display: "flex",
      gap: "1rem",
      fontSize: "1.25rem",
    },
    socialIcon: {
      color: "#D1D5DB",
      textDecoration: "none",
      transition: "all 0.3s ease",
      padding: "0.875rem",
      borderRadius: "0.75rem",
      background: "rgba(255, 255, 255, 0.05)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      backdropFilter: "blur(10px)",
      WebkitBackdropFilter: "blur(10px)",
      display: "flex" as const,
      alignItems: "center",
      justifyContent: "center",
    },
    newsletterTitle: {
      fontSize: "1.375rem",
      fontWeight: 600,
      marginBottom: "1rem",
      color: "#FFFFFF",
      letterSpacing: "-0.01em",
    },
    newsletterDesc: {
      color: "#D1D5DB",
      marginBottom: "2rem",
      fontSize: "1rem",
      lineHeight: 1.6,
    },
    privacy: {
      marginTop: "1rem",
      fontSize: "0.875rem",
      textDecoration: "none",
      color: "#9CA3AF",
      transition: "color 0.3s ease",
      display: "inline-block",
      padding: "0.5rem 1rem",
      borderRadius: "0.5rem",
      background: "rgba(255, 255, 255, 0.03)",
      border: "1px solid rgba(255, 255, 255, 0.08)",
    },
    copyright: {
      borderTop: "1px solid rgba(75, 85, 99, 0.3)",
      paddingTop: "2rem",
      textAlign: "center" as const,
      color: "#9CA3AF",
      marginTop: "3rem",
      fontSize: "0.875rem",
    },
  };

  return (
    <footer style={styles.footer}>
      {/* Background decorative elements */}
      <div
        style={{
          position: "absolute",
          top: "-10%",
          right: "-5%",
          width: "400px",
          height: "400px",
          background: "radial-gradient(circle, rgba(222, 23, 133, 0.1) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(80px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-15%",
          left: "-10%",
          width: "500px",
          height: "500px",
          background: "radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(100px)",
        }}
      />

      {/* Top accent line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "20%",
          right: "20%",
          height: "2px",
          background: "linear-gradient(90deg, transparent, rgba(222, 23, 133, 0.5), transparent)",
        }}
      />

      <div style={styles.container}>
        <div
          style={{
            ...styles.grid,
            ...(isMd ? styles.gridMd : {}),
          }}
        >
          {/* Company Info */}
          <div>
            <img src={logo} alt="Company logo" style={styles.logo} />
            <p style={styles.description}>{description}</p>
            <div style={styles.emailRow}>
              <a
                href="mailto:akbar@usebeya.com"
                aria-label="Email"
                style={styles.emailLink}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "rgba(222, 23, 133, 0.1)";
                  e.currentTarget.style.borderColor = "rgba(222, 23, 133, 0.3)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <FaEnvelope style={{ width: "1.125rem", height: "1.125rem" }} />
                <span>akbar@usebeya.com</span>
              </a>
            </div>
          </div>

          {/* Social Media */}
          <div>
            <h2 style={styles.sectionTitle}>Connect With Us</h2>
            <div style={styles.socialIcons}>
              <a
                href="https://www.facebook.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                style={styles.socialIcon}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "rgba(24, 119, 242, 0.15)";
                  e.currentTarget.style.borderColor = "rgba(24, 119, 242, 0.3)";
                  e.currentTarget.style.color = "#1877F2";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.color = "#D1D5DB";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <FaFacebookF />
              </a>
              <a
                href="https://twitter.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter"
                style={styles.socialIcon}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "rgba(29, 161, 242, 0.15)";
                  e.currentTarget.style.borderColor = "rgba(29, 161, 242, 0.3)";
                  e.currentTarget.style.color = "#1DA1F2";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.color = "#D1D5DB";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <FaTwitter />
              </a>
              <a
                href="https://www.instagram.com/usebeya/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                style={styles.socialIcon}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "rgba(225, 48, 108, 0.15)";
                  e.currentTarget.style.borderColor = "rgba(225, 48, 108, 0.3)";
                  e.currentTarget.style.color = "#E1306C";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.color = "#D1D5DB";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <FaInstagram />
              </a>
              <a
                href="https://linkedin.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                style={styles.socialIcon}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "rgba(0, 119, 181, 0.15)";
                  e.currentTarget.style.borderColor = "rgba(0, 119, 181, 0.3)";
                  e.currentTarget.style.color = "#0077B5";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.color = "#D1D5DB";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <FaLinkedinIn />
              </a>
            </div>
          </div>

          {/* Newsletter */}
          <div>
            <h2 style={styles.newsletterTitle}>{newsletterTitle}</h2>
            <p style={styles.newsletterDesc}>{newsletterDescription}</p>
            <NewsletterForm />
          </div>
        </div>

        {/* Privacy Policy Link */}
        <div style={{ marginTop: "1rem" }}>
          <Link
            to="/privacy"
            style={styles.privacy}
            onMouseEnter={e => {
              e.currentTarget.style.color = "#FFFFFF";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = "#9CA3AF";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
            }}
          >
            Privacy Policy
          </Link>
        </div>

        {/* Copyright */}
        <div style={styles.copyright}>{copyrightText}</div>
      </div>
    </footer>
  );
};