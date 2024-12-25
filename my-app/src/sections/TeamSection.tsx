import React from "react";
import Slider from "react-slick";
import { TeamMember } from "../components/ui/TeamMember";

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

interface TeamProps {
    teamMembers: {
        image: string;
        name: string;
        role: string;
        socialLinks: {
            href: string;
            text: string;
        }[];
    }[];
}

export const TeamSection: React.FC<TeamProps> = ({ teamMembers }) => {
    const settings = {
        dots: true,
        infinite: true,
        speed: 500,
        slidesToShow: 3,  // Number of team members visible at once
        slidesToScroll: 1,
        autoplay: true,
        autoplaySpeed: 3000,
        responsive: [
            {
                breakpoint: 1024,
                settings: {
                    slidesToShow: 2,
                },
            },
            {
                breakpoint: 640,
                settings: {
                    slidesToShow: 1,
                },
            },
        ],
    };

    return (
        <section className="py-20">
            <div className="container mx-auto px-4">
                <h2 className="text-3xl font-bold text-center mb-12">Our Team</h2>
                <Slider {...settings}>
                    {teamMembers.map((member, index) => (
                        <div key={index}>
                            <TeamMember {...member} />
                        </div>
                    ))}
                </Slider>
            </div>
        </section>
    );
};
