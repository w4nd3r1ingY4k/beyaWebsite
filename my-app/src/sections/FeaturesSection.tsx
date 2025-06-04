import React from "react";
import { FeatureCard } from "../components/ui/FeatureCard";

interface FeaturesProps {
    features: {
        icon: string;
        title: string;
        description: string;
    }[];
}

const sectionStyle: React.CSSProperties = {
    paddingTop: "5rem",
    paddingBottom: "5rem",
    background: "#FDFDFD",
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

function useResponsiveGrid() {
    const [isMd, setIsMd] = React.useState(window.innerWidth >= 768);

    React.useEffect(() => {
        const handleResize = () => setIsMd(window.innerWidth >= 768);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return isMd;
}

export const FeaturesSection: React.FC<FeaturesProps> = ({ features }) => {
    const isMd = useResponsiveGrid();

    return (
        <section style={sectionStyle} id="what-we-do">
            <div style={containerStyle}>
                <div style={isMd ? gridMdStyle : gridStyle}>
                    {features.map((feature, index) => (
                        <FeatureCard key={index} {...feature} />
                    ))}
                </div>
            </div>
        </section>
    );
};
