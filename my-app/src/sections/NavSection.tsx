import React from "react";
import { NavLink } from "../components/NavLink";
import { AppDownload } from "../components/AppDownload";

interface NavProps {
    quickLinks: {
        href: string;
        text: string;
        isActive?: boolean;
    }[];
    appDownload: {
        googlePlayLink: string;
        appStoreLink: string;
        googlePlayImage: string;
        appStoreImage: string;
    };
}

export const NavSection: React.FC<NavProps> = ({ quickLinks, appDownload }) => {
    return (
        <nav className="sticky top-0 bg-white shadow-sm z-50">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center h-20">
                    <div className="flex gap-8">
                        {quickLinks.map((link, index) => (
                            <NavLink key={index} {...link} />
                        ))}
                    </div>
                    <AppDownload {...appDownload} />
                </div>
            </div>
        </nav>
    );
};
