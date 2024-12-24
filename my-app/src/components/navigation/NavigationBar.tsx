import * as React from "react";

export const NavigationBar: React.FC = () => {
    return (
        <div className="sticky top-0 left-0 right-0 bg-white shadow-md z-50">
            <div className="flex justify-between items-center h-20 px-8 w-full">
                <div className="absolute left-1/2 transform -translate-x-1/2">
                    <img
                        loading="lazy"
                        src="/assets/logo.png"
                        alt="Company Logo"
                        className="object-contain aspect-[5.95] w-[167px]"
                    />
                </div>
            </div>
        </div>
    );
};
