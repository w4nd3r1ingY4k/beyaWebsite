import React from "react";
import { TeamMember } from "../components/ui/TeamMember";

interface TeamProps {
    teamMembers: {
        image: string;
        name: string;
        role: string;
        description: string;
        socialLinks: {
            icon: string;
            href: string;
            text: string;
        }[];
    }[];
}

export const TeamSection: React.FC<TeamProps> = ({ teamMembers }) => {
    return (
        <section className="py-20">
            <div className="container mx-auto px-4">
                <h2 className="text-3xl font-bold text-center mb-12">Our Team</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {teamMembers.map((member, index) => (
                        <TeamMember key={index} {...member} />
                    ))}
                </div>
            </div>
        </section>
    );
};
