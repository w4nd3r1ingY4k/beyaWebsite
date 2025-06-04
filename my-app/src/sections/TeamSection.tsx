import React from "react";
import Slider from "react-slick";
import { TeamMember } from "../components/TeamMember";

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

interface TeamProps {
    teamMembers: {
        image: string;
        name: string;
        school: string;
        major: string;
        role: string;
        socialLinks: {
            href: string;
            text: string;
        }[];
    }[];
}

export const TeamSection: React.FC<TeamProps> = ({ teamMembers }) => {
    const settings = {
        dots: false,
        infinite: false,
        speed: 0,
        slidesToShow: 3,  // Number of team members visible at once
        slidesToScroll: 1,
        autoplay: true,
        autoplaySpeed: 2000,
        swipe: true, 
        touchMove: true,
        draggable: true,
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
<section className="py-20 bg-[#FCFCFC]" id="our-team">            
    <div className="container mx-auto px-10">
                <h2 className="text-3xl font-bold text-center mb-12 text-[#3A3A3A]">Our Team</h2>
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
