import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Link } from "react-router-dom";

export const NavigationBar: React.FC = () => {
    const [active, setActive] = useState<string>("");
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

    const navigate = useNavigate();
    const location = useLocation();

    // Track scroll position to update active link
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
            const isMobile = window.innerWidth < 768;
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

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md">
            <div className="relative flex items-center justify-between py-8 px-8 w-full max-w-screen-xl mx-auto">
                {/* Left Navigation Links */}
                <div className="hidden md:flex space-x-6">
                    <button onClick={() => handleClick("mission")} className="text-sm hover:text-purple-500">
                        Our Mission
                    </button>
                    <button onClick={() => handleClick("what-we-do")} className="text-sm hover:text-purple-500">
                        What We Do
                    </button>
                    <button onClick={() => handleClick("features")} className="text-sm hover:text-purple-500">
                        Features
                    </button>
                </div>

                <div className="absolute left-1/2 transform -translate-x-1/2 flex-shrink-0">
                    <img
                        loading="lazy"
                        src="/assets/icons/logo-1.png"
                        alt="Company Logo"
                        className="object-contain w-10 md:w-10 lg:w-20"
                    />
                </div>

                <div className="hidden md:flex space-x-6">
                    <button onClick={() => handleClick("impact")} className="text-sm hover:text-purple-500">
                        Impact
                    </button>
                    <button onClick={() => handleClick("blog")} className="text-sm hover:text-purple-500">
                        Blog
                    </button>
                    <button onClick={() => handleClick("our-team")} className="text-sm hover:text-purple-500">
                        Our Team
                    </button>
                    <Link
                        to="/login"
                        className="text-sm px-5 py-2 rounded bg-[#DE1785] text-white font-semibold hover:bg-[#b0136a] transition-colors duration-200 shadow"
                    >
                        Log In
                    </Link>
                </div>

                <button
                    className="md:hidden p-2 focus:outline-none"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    aria-label="Toggle Mobile Menu"
                >
                    <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                    </svg>
                </button>
            </div>

            {isMobileMenuOpen && (
                <div className="md:hidden bg-white shadow-lg border-t border-gray-200">
                    <div className="flex flex-col">
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
                                className="text-sm py-3 px-6 transition-colors duration-200 hover:bg-gray-50 hover:text-purple-500 border-b border-gray-200"
                                aria-label={`${label} Section`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default NavigationBar;