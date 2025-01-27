import React, { useState, useEffect } from "react";

export const NavigationBar: React.FC = () => {
    const [active, setActive] = useState<string>("");

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
            section.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    };

    return (
        <nav className="sticky top-0 z-50 bg-white shadow-md">
            <div className="relative flex items-center justify-between py-8 px-8 w-full max-w-screen-xl mx-auto">
                {/* Left Navigation Links */}
                <div className="flex space-x-6">
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
                        className="object-contain w-15 md:w-10 lg:w-20"
                    />
                </div>

                {/* Right Navigation Links */}
                <div className="flex space-x-6">
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
            </div>
        </nav>
    );
};

export default NavigationBar;
