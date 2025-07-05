import { motion } from 'framer-motion';
import { ArrowDownCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function ScrollDown() {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 100) {
                setIsVisible(false);
            } else {
                setIsVisible(true);
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const handleClick = (sectionId: string) => {
        const section = document.getElementById(sectionId);
        if (section) {
            const isMobile = window.innerWidth < 768;
            const yOffset = isMobile ? -100 : 0;
            const yPosition = section.getBoundingClientRect().top + window.scrollY + yOffset;

            window.scrollTo({
                top: yPosition,
                behavior: "smooth",
            });
        }
    };

    const containerStyle: React.CSSProperties = {
        position: 'absolute',
        bottom: 40,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: 'pointer',
        justifyContent: 'center',
        zIndex: 10,
    };

    const iconStyle: React.CSSProperties = {
        color: 'white',
        transition: 'color 0.2s',
        display: 'block',
    };

    const textStyle: React.CSSProperties = {
        fontSize: '0.875rem',
        marginTop: 8,
        color: 'white',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        fontWeight: 400,
    };

    return (
        <motion.div
            style={containerStyle}
            initial={{ opacity: 1 }}
            animate={{ opacity: isVisible ? 1 : 0 }}
            transition={{ opacity: { duration: 0.5 } }}
            onClick={() => handleClick("mission")}
        >
            <motion.div
                initial={{ y: -5 }}
                animate={{ y: 5 }}
                transition={{ repeat: Infinity, repeatType: "reverse", duration: 1.5 }}
            >
                <ArrowDownCircle size={40} style={iconStyle} />
            </motion.div>
            <span style={textStyle}>
                Scroll Down
            </span>
        </motion.div>
    );
}