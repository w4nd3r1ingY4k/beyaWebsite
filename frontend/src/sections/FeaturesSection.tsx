import React from "react";
import { FeatureCard } from "../components/ui/FeatureCard";
import styles from '../styles/FeaturesSection.module.css';

interface FeaturesProps {
    features: {
        icon: string;
        title: string;
        description: string;
    }[];
}

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
        <section className={styles.section} id="what-we-do">
            <div className={styles.container}>
                <div className={isMd ? styles.gridMd : styles.grid}>
                    {features.map((feature, index) => (
                        <FeatureCard key={index} {...feature} />
                    ))}
                </div>
            </div>
        </section>
    );
};
