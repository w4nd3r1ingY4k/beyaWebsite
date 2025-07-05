import React from "react";
import { Statistic } from "../components/Statistic";

interface StatisticsProps {
    statistics: {
        icon: string;
        value: string;
        label: string;
    }[];
}

const sectionStyle: React.CSSProperties = {
    backgroundColor: "#FBFBFB",
    paddingTop: "5rem",
    paddingBottom: "5rem",
};

const containerStyle: React.CSSProperties = {
    maxWidth: "1200px",
    margin: "0 auto",
    paddingLeft: "1rem",
    paddingRight: "1rem",
};

const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "2rem",
};

const gridMdStyle: React.CSSProperties = {
    ...gridStyle,
    gridTemplateColumns: "repeat(3, 1fr)",
};

export const StatisticsSection: React.FC<StatisticsProps> = ({ statistics }) => {
    // Responsive grid: use 1 column on small screens, 3 on medium+
    const [isMd, setIsMd] = React.useState(
        typeof window !== "undefined" ? window.innerWidth >= 768 : false
    );

    React.useEffect(() => {
        const handleResize = () => {
            setIsMd(window.innerWidth >= 768);
        };
        window.addEventListener("resize", handleResize);
        handleResize();
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return (
        <section style={sectionStyle} id="impact">
            <div style={containerStyle}>
                <div style={isMd ? gridMdStyle : gridStyle}>
                    {statistics.map((stat, index) => (
                        <Statistic key={index} {...stat} />
                    ))}
                </div>
            </div>
        </section>
    );
};
