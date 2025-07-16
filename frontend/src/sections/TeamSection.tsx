import React from "react";
import Slider from "react-slick";
import { TeamMember } from "../components/TeamMember";
import styles from '../styles/TeamSection.module.css';

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
        slidesToShow: 3,
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
        <section id="our-team" className={styles.section}>
            <div className={styles.container}>
                <h2 className={styles.header}>Our Team</h2>
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
