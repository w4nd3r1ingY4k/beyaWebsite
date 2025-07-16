import React from "react";
import { Statistic } from "../components/Statistic";
import styles from '../styles/StatisticsSection.module.css';

interface StatisticsProps {
    statistics: {
        icon: string;
        value: string;
        label: string;
    }[];
}

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
        <section className={styles.section} id="impact">
            <div className={styles.container}>
                <div className={isMd ? styles.gridMd : styles.grid}>
                    {statistics.map((stat, index) => (
                        <Statistic key={index} {...stat} />
                    ))}
                </div>
            </div>
        </section>
    );
};
