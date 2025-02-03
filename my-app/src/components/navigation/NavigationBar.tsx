import React, { useState, useEffect } from "react";

export const NavigationBar: React.FC = () => {
    const [active, setActive] = useState<string>("");
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

    // Set active state based on the current section when the page is scrolled
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

    const handleClick = (sectionId: string) => {
        setActive(sectionId);

        const section = document.getElementById(sectionId);
        if (section) {
            const isMobile = window.innerWidth < 768; // Check for mobile devices
            const yOffset = isMobile ? -100 : 0; // Adjust this value based on your fixed navbar height
            const yPosition = section.getBoundingClientRect().top + window.scrollY + yOffset;

            window.scrollTo({
                top: yPosition,
                behavior: "smooth",
            });
        }

        setIsMobileMenuOpen(false); // Close the mobile menu after clicking a link
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md">
            <div className="relative flex items-center justify-between py-8 px-8 w-full max-w-screen-xl mx-auto">
                {/* Left Navigation Links */}
                <div className="hidden md:flex space-x-6">
                    <button
                        onClick={() => handleClick("mission")}
                        className={`text-sm transition-colors duration-200 hover:text-purple-500`}
                        aria-label="Mission Section"
                    >
                        Our Mission
                    </button>
                    <button
                        onClick={() => handleClick("what-we-do")}
                        className={`text-sm transition-colors duration-200 hover:text-purple-500`}
                        aria-label="What We Do Section"
                    >
                        What We Do
                    </button>
                    <button
                        onClick={() => handleClick("features")}
                        className={`text-sm transition-colors duration-200 hover:text-purple-500`}
                        aria-label="Features Section"
                    >
                        Features
                    </button>
                </div>

                {/* Center Logo */}
                <div className="absolute left-1/2 transform -translate-x-1/2 flex-shrink-0">
                    <img
                        loading="lazy"
                        src="/assets/icons/logo.png"
                        alt="Company Logo"
                        className="object-contain w-10 md:w-10 lg:w-20"
                    />
                </div>

                {/* Right Navigation Links */}
                <div className="hidden md:flex space-x-6">
                    <button
                        onClick={() => handleClick("impact")}
                        className={`text-sm transition-colors duration-200 hover:text-purple-500`}
                        aria-label="Impact Section"
                    >
                        Impact
                    </button>
                    <button
                        onClick={() => handleClick("blog")}
                        className={`text-sm transition-colors duration-200 hover:text-purple-500`}
                        aria-label="Blog Section"
                    >
                        Blog
                    </button>
                    <button
                        onClick={() => handleClick("our-team")}
                        className={`text-sm transition-colors duration-200 hover:text-purple-500`}
                        aria-label="Our Team Section"
                    >
                        Our Team
                    </button>
                </div>

                {/* Mobile Menu Toggle Button */}
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
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 6h16M4 12h16m-7 6h7"
                        />
                    </svg>
                </button>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden bg-white shadow-lg border-t border-gray-200 ">
                    <div className="flex flex-col">
                        <button
                            onClick={() => handleClick("mission")}
                            className={`text-sm py-3 px-6 transition-colors duration-200 hover:bg-gray-50 hover:text-purple-500 border-b border-gray-200`}
                            aria-label="Mission Section"
                        >
                            Our Mission
                        </button>
                        <button
                            onClick={() => handleClick("what-we-do")}
                            className={`text-sm py-3 px-6 transition-colors duration-200 hover:bg-gray-50 hover:text-purple-500 border-b border-gray-200`}
                            aria-label="What We Do Section"
                        >
                            What We Do
                        </button>
                        <button
                            onClick={() => handleClick("features")}
                            className={`text-sm py-3 px-6 transition-colors duration-200 hover:bg-gray-50 hover:text-purple-500 border-b border-gray-200`}
                            aria-label="Features Section"
                        >
                            Features
                        </button>
                        <button
                            onClick={() => handleClick("impact")}
                            className={`text-sm py-3 px-6 transition-colors duration-200 hover:bg-gray-50 hover:text-purple-500 border-b border-gray-200`}
                            aria-label="Impact Section"
                        >
                            Impact
                        </button>
                        <button
                            onClick={() => handleClick("blog")}
                            className={`text-sm py-3 px-6 transition-colors duration-200 hover:bg-gray-50 hover:text-purple-500 border-b border-gray-200`}
                            aria-label="Blog Section"
                        >
                            Blog
                        </button>
                        <button
                            onClick={() => handleClick("our-team")}
                            className={`text-sm py-3 px-6 transition-colors duration-200 hover:bg-gray-50 hover:text-purple-500`}
                            aria-label="Our Team Section"
                        >
                            Our Team
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default NavigationBar;