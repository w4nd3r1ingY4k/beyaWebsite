    import { motion } from 'framer-motion';
    import { ArrowDownCircle } from 'lucide-react';
    import { useState, useEffect } from 'react';

    export default function ScrollDown() {
        const [isVisible, setIsVisible] = useState(true);

        // Hide the scroll down button when scrolled down
        useEffect(() => {
            const handleScroll = () => {
                if (window.scrollY > 100) {
                    setIsVisible(false); // Hide when scrolled down
                } else {
                    setIsVisible(true); // Show when at top
                }
            };
    
            window.addEventListener("scroll", handleScroll);
            return () => window.removeEventListener("scroll", handleScroll);
        }, []);

        // Function to scroll smoothly to a section
        const handleClick = (sectionId: string) => {
            const section = document.getElementById(sectionId);
            if (section) {
                const isMobile = window.innerWidth < 768; // Check for mobile devices
                const yOffset = isMobile ? -100 : 0; // Adjust based on navbar height
                const yPosition = section.getBoundingClientRect().top + window.scrollY + yOffset;
    
                window.scrollTo({
                    top: yPosition,
                    behavior: "smooth",
                });
            }
        }
        
        return (
            <motion.div
                className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex flex-col items-center cursor-pointer justify-center"
                initial={{ opacity: 1 }}
                animate={{ opacity: isVisible ? 1 : 0 }}
                transition={{ opacity: { duration: 0.5 } }} // Smooth fade
                onClick={() => handleClick("mission")}
            >
                <motion.div
                    initial={{ y: -5 }}
                    animate={{ y: 5 }}
                    transition={{ repeat: Infinity, repeatType: "reverse", duration: 1.5 }}
                >
                    <ArrowDownCircle size={40} className="text-white hover:text-white transition" />
                </motion.div>
                
                    <span className="text-sm mt-2 text-white uppercase tracking-wider">
                        Scroll Down
                    </span>
            </motion.div>
        );
    }
