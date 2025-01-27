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
        dots: false,
        infinite: true,
        speed: 500,
        slidesToShow: 3,  // Number of team members visible at once
        slidesToScroll: 0,
        autoplay: false,
        autoplaySpeed: 3000,
        swipe: false, // Disable swiping
        touchMove: false, // Disable touch movement
        draggable: false, // Disable dragging
        responsive: [
            {
                breakpoint: 1024,
                settings: {
                    slidesToShow: 2,
                    slidesToScroll: 1,
                    autoplay: true,
                    swipe: true, 
                    touchMove: true,
                    draggable: true,
                },
            },
            {
                breakpoint: 640,
                settings: {
                    slidesToShow: 1,
                    slidesToScroll: 1,
                    autoplay: true,
                    swipe: true,
                    touchMove: true,
                    draggable: true,
                },
            },
        ],
    };

    return (
        <section className="py-20" id="our-team">
            <div className="container mx-auto px-10">
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
