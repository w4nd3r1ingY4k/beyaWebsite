import React from "react";
import { Statistic } from "../components/ui/Statistic";

interface StatisticsProps {
    statistics: {
        icon: string;
        value: string;
        label: string;
    }[];
}

export const StatisticsSection: React.FC<StatisticsProps> = ({ statistics }) => {
    return (
        <section className="bg-indigo-600 py-20">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {statistics.map((stat, index) => (
                        <Statistic key={index} {...stat} />
                    ))}
                </div>
            </div>
        </section>
    );
};
