import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";

const navButtonStyle: React.CSSProperties = {
    fontSize: "0.875rem",
    background: "none",
    border: "none",
    color: "#333",
    cursor: "pointer",
    padding: "0.5rem 1rem",
    transition: "color 0.2s",
};
const navButtonHoverStyle: React.CSSProperties = {
    color: "#a259d9",
};
const navLinkStyle: React.CSSProperties = {
    fontSize: "0.875rem",
    padding: "0.5rem 1.25rem",
    borderRadius: "0.375rem",
    background: "#DE1785",
    color: "#fff",
    fontWeight: 600,
    textDecoration: "none",
    transition: "background 0.2s",
    boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
    border: "none",
    display: "inline-block",
};
const navLinkHoverStyle: React.CSSProperties = {
    background: "#b0136a",
};
const navContainerStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    background: "#fff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
};
const navInnerStyle: React.CSSProperties = {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "2rem",
    width: "100%",
    maxWidth: "1280px",
    margin: "0 auto",
};
const navLeftRightStyle: React.CSSProperties = {
    display: "flex",
    gap: "1.5rem",
};
const navLogoContainerStyle: React.CSSProperties = {
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
    flexShrink: 0,
};
const navLogoStyle: React.CSSProperties = {
    objectFit: "contain",
    width: "40px",
    height: "auto",
};
const mobileMenuButtonStyle: React.CSSProperties = {
    padding: "0.5rem",
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "block",
};
const mobileMenuStyle: React.CSSProperties = {
    background: "#fff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
    borderTop: "1px solid #e5e7eb",
};
const mobileMenuItemStyle: React.CSSProperties = {
    fontSize: "0.875rem",
    padding: "0.75rem 1.5rem",
    transition: "background 0.2s, color 0.2s",
    background: "none",
    border: "none",
    textAlign: "left",
    cursor: "pointer",
    borderBottom: "1px solid #e5e7eb",
    color: "#333",
};

export const NavigationBar: React.FC = () => {
    const [active, setActive] = useState<string>("");
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
    const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);

    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        const handleScroll = () => {
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
        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    }, []);

    const scrollToSection = (sectionId: string) => {
        const section = document.getElementById(sectionId);
        if (section) {
            const yOffset = isMobile ? -100 : 0;
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

    // For hover effect, you may want to use a library or CSS, but here's a simple inline workaround:
    const [hovered, setHovered] = useState<string | null>(null);

    return (
        <nav style={navContainerStyle}>
            <div style={navInnerStyle}>
                {/* Left Navigation Links */}
                {!isMobile && (
                    <div style={navLeftRightStyle}>
                        {["mission", "what-we-do", "features"].map((id) => (
                            <button
                                key={id}
                                onClick={() => handleClick(id)}
                                style={{
                                    ...navButtonStyle,
                                    ...(hovered === id ? navButtonHoverStyle : {}),
                                }}
                                onMouseEnter={() => setHovered(id)}
                                onMouseLeave={() => setHovered(null)}
                            >
                                {id === "mission" && "Our Mission"}
                                {id === "what-we-do" && "What We Do"}
                                {id === "features" && "Features"}
                            </button>
                        ))}
                    </div>
                )}

                <div style={navLogoContainerStyle}>
                    <img
                        loading="lazy"
                        src="/assets/icons/logo-1.png"
                        alt="Company Logo"
                        style={navLogoStyle}
                    />
                </div>

                {!isMobile && (
                    <div style={navLeftRightStyle}>
                        {["impact", "blog", "our-team"].map((id) => (
                            <button
                                key={id}
                                onClick={() => handleClick(id)}
                                style={{
                                    ...navButtonStyle,
                                    ...(hovered === id ? navButtonHoverStyle : {}),
                                }}
                                onMouseEnter={() => setHovered(id)}
                                onMouseLeave={() => setHovered(null)}
                            >
                                {id === "impact" && "Impact"}
                                {id === "blog" && "Blog"}
                                {id === "our-team" && "Our Team"}
                            </button>
                        ))}
                        <Link
                            to="/login"
                            style={{
                                ...navLinkStyle,
                                ...(hovered === "login" ? navLinkHoverStyle : {}),
                            }}
                            onMouseEnter={() => setHovered("login")}
                            onMouseLeave={() => setHovered(null)}
                        >
                            Log In
                        </Link>
                    </div>
                )}

                {isMobile && (
                    <button
                        style={mobileMenuButtonStyle}
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        aria-label="Toggle Mobile Menu"
                    >
                        <svg
                            width={24}
                            height={24}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                        </svg>
                    </button>
                )}
            </div>

            {isMobileMenuOpen && isMobile && (
                <div style={mobileMenuStyle}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        {[
                            { id: "mission", label: "Our Mission" },
                            { id: "what-we-do", label: "What We Do" },
                            { id: "features", label: "Features" },
                            { id: "impact", label: "Impact" },
                            { id: "blog", label: "Blog" },
                            { id: "our-team", label: "Our Team" },
                        ].map(({ id, label }) => (
                            <button
                                key={id}
                                onClick={() => handleClick(id)}
                                style={{
                                    ...mobileMenuItemStyle,
                                    ...(hovered === id ? navButtonHoverStyle : {}),
                                }}
                                onMouseEnter={() => setHovered(id)}
                                onMouseLeave={() => setHovered(null)}
                                aria-label={`${label} Section`}
                            >
                                {label}
                            </button>
                        ))}
                        <Link
                            to="/login"
                            style={{
                                ...mobileMenuItemStyle,
                                ...navLinkStyle,
                                ...(hovered === "login" ? navLinkHoverStyle : {}),
                                margin: "1rem 0",
                                borderBottom: "none",
                                textAlign: "center",
                            }}
                            onMouseEnter={() => setHovered("login")}
                            onMouseLeave={() => setHovered(null)}
                        >
                            Log In
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default NavigationBar;