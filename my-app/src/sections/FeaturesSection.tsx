import React from "react";
import { FeatureCard } from "../components/ui/FeatureCard";

interface FeaturesProps {
    features: {
        icon: string;
        title: string;
        description: string;
    }[];
}

export const FeaturesSection: React.FC<FeaturesProps> = ({ features }) => {
    return (
        <section className="pt-20 pb-20" id="what-we-do">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <FeatureCard key={index} {...feature} />
                    ))}
                </div>
            </div>
        </section>
    );
};
