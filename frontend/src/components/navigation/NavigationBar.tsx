import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";

export const NavigationBar: React.FC = () => {
  const [active, setActive] = useState<string>("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
      
      const sections = document.querySelectorAll("section");
      let currentActive = "";
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 100 && rect.bottom >= 100) {
          currentActive = section.id;
        }
      });
      setActive(currentActive);
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (section) {
      const yOffset = -80;
      const yPosition = section.getBoundingClientRect().top + window.scrollY + yOffset;
      window.scrollTo({
        top: yPosition,
        behavior: "smooth",
      });
    }
  };

  const handleClick = (sectionId: string) => {
    setActive(sectionId);
    setIsMobileMenuOpen(false);
    if (location.pathname === "/") {
      scrollToSection(sectionId);
    } else {
      navigate("/", { state: { scrollTo: sectionId } });
    }
  };

  const navItems = [
    /* { id: "mission", label: "Mission" },
    { id: "features", label: "Features" },
    { id: "blog", label: "Blog" },
    { id: "our-team", label: "Team" }, */
  ];

  // Styles
  const navStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: isScrolled ? "rgba(255, 255, 255, 0.8)" : "rgba(255, 255, 255, 0.9)",
    backdropFilter: isScrolled ? "blur(10px)" : "none",
    boxShadow: isScrolled ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
    transition: "all 0.3s ease",
  };

  const navInnerStyle: React.CSSProperties = {
    maxWidth: "1280px",
    margin: "0 auto",
    padding: "0 1.5rem",
    height: "64px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  };

  const logoStyle: React.CSSProperties = {
    height: "47px",
    width: "auto",
    objectFit: "contain",
  };

  const desktopNavStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.25rem",
  };

  const navButtonStyle = (itemId: string): React.CSSProperties => ({
    padding: "0.5rem 1rem",
    fontSize: "0.875rem",
    fontWeight: 500,
    color: active === itemId ? "#111827" : "#4B5563",
    backgroundColor: active === itemId ? "#F3F4F6" : hoveredItem === itemId ? "#F9FAFB" : "transparent",
    border: "none",
    borderRadius: "0.5rem",
    cursor: "pointer",
    transition: "all 0.2s ease",
    outline: "none",
  });

  const ctaButtonStyle: React.CSSProperties = {
    marginLeft: "1rem",
    paddingLeft: "1rem",
    borderLeft: "1px solid #E5E7EB",
  };

  const ctaLinkStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "0.5rem 1.25rem",
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "#fff",
    backgroundColor: hoveredItem === "cta" ? "#b0136a" : "#DE1785",
    borderRadius: "0.5rem",
    textDecoration: "none",
    transition: "all 0.2s ease",
    transform: hoveredItem === "cta" ? "scale(1.05)" : "scale(1)",
    boxShadow: hoveredItem === "cta" ? "0 4px 14px rgba(222, 23, 133, 0.3)" : "none",
  };

  const mobileMenuButtonStyle: React.CSSProperties = {
    padding: "0.5rem",
    color: "#4B5563",
    backgroundColor: "transparent",
    border: "none",
    borderRadius: "0.375rem",
    cursor: "pointer",
    outline: "none",
  };

  const mobileMenuStyle: React.CSSProperties = {
    backgroundColor: "#fff",
    borderTop: "1px solid #E5E7EB",
    boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
    maxHeight: isMobileMenuOpen ? "400px" : "0",
    opacity: isMobileMenuOpen ? 1 : 0,
    overflow: "hidden",
    transition: "all 0.3s ease-in-out",
  };

  const mobileMenuInnerStyle: React.CSSProperties = {
    padding: "0.5rem 1rem",
  };

  const mobileNavButtonStyle = (itemId: string): React.CSSProperties => ({
    display: "block",
    width: "100%",
    padding: "0.75rem 1rem",
    marginBottom: "0.25rem",
    fontSize: "0.875rem",
    fontWeight: 500,
    color: active === itemId ? "#111827" : "#4B5563",
    backgroundColor: active === itemId ? "#F3F4F6" : "transparent",
    border: "none",
    borderRadius: "0.5rem",
    textAlign: "left",
    cursor: "pointer",
    transition: "all 0.2s ease",
  });

  const mobileCTAStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    padding: "0.75rem 1rem",
    marginTop: "0.5rem",
    marginBottom: "0.5rem",
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "#fff",
    backgroundColor: "#DE1785",
    borderRadius: "0.5rem",
    textAlign: "center",
    textDecoration: "none",
    transition: "all 0.2s ease",
  };

  return (
    <>
      <nav style={navStyle}>
        <div style={navInnerStyle}>
          {/* Logo */}
          <div>
            <img
              loading="lazy"
              src="/assets/icons/logo-1.png"
              alt="Beya"
              style={logoStyle}
            />
          </div>

          {/* Desktop Navigation */}
          {!isMobile && (
            <div style={desktopNavStyle}>
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleClick(item.id)}
                  style={navButtonStyle(item.id)}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  {item.label}
                </button>
              ))}
              <div style={ctaButtonStyle}>
                <Link
                  to="/login"
                  style={ctaLinkStyle}
                  onMouseEnter={() => setHoveredItem("cta")}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  Get Started
                </Link>
              </div>
            </div>
          )}

          {/* Mobile Menu Button */}
          {isMobile && (
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              style={mobileMenuButtonStyle}
              aria-label="Toggle menu"
            >
              <svg
                width={24}
                height={24}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          )}
        </div>

        {/* Mobile Menu */}
        <div style={mobileMenuStyle}>
          <div style={mobileMenuInnerStyle}>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleClick(item.id)}
                style={mobileNavButtonStyle(item.id)}
              >
                {item.label}
              </button>
            ))}
            <Link
              to="/login"
              onClick={() => setIsMobileMenuOpen(false)}
              style={mobileCTAStyle}
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Spacer to prevent content from going under fixed nav */}
      <div style={{ height: "64px" }} />
    </>
  );
};

export default NavigationBar;