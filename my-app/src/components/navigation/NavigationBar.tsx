import React, { useState, useEffect } from "react";

export const NavigationBar: React.FC = () => {
    const [active, setActive] = useState<string>("");

    // Set active state based on current URL on component mount
    useEffect(() => {
        const path = window.location.pathname;
        switch (path) {
            case "/blog":
                setActive("Blog");
                break;
            case "/products":
                setActive("Products");
                break;
            case "/support":
                setActive("Support");
                break;
            default:
                setActive("");
        }
    }, []);

    const handleClick = (page: string) => {
        setActive(page);
        // Navigate to the page
        window.location.href = `/${page.toLowerCase()}`;
    };

    return (
        <nav className="sticky top-0 left-0 right-0 bg-white ">
            <div className="flex flex-col items-center py-4 w-full">
                {/* Logo */}
                <img
                    loading="lazy"
                    src="/assets/icons/logo.png"
                    alt="Company Logo"
                    className="object-contain w-48 md:w-64 lg:w-52"
                />

                {/* Button Group */}
                <div className="flex space-x-6 mt-4">
                    <button
                        onClick={() => handleClick("Blog")}
                        className={`text-lg transition-colors duration-200 ${
                            active === "Blog"
                                ? "text-purple-500 "
                                : "text-gray-700 hover:text-purple-500 hover"
                        } focus:outline-none focus:ring-0 focus:ring-purple-500`}
                        aria-label="Blog Page"
                    >
                        Blog
                    </button>
                    <button
                        onClick={() => handleClick("Products")}
                        className={`text-lg transition-colors duration-200 ${
                            active === "Products"
                                ? "text-purple-500 "
                                : "text-gray-700 hover:text-purple-500 hover"
                        } focus:outline-none focus:ring-0 focus:ring-purple-500`}
                        aria-label="Products Page"
                    >
                        Products
                    </button>
                    <button
                        onClick={() => handleClick("Support")}
                        className={`text-lg transition-colors duration-200 ${
                            active === "Support"
                                ? "text-purple-500 "
                                : "text-gray-700 hover:text-purple-500 hover"
                        } focus:outline-none focus:ring-0 focus:ring-purple-500`}
                        aria-label="Support Page"
                    >
                        Support
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default NavigationBar;