import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Footer } from "../components/Footer";
import { FeaturesSection } from "../sections/FeaturesSection";
import { HeroSection } from "../sections/HeroSection";
import { StatisticsSection } from "../sections/StatisticsSection";
import { TeamSection } from "../sections/TeamSection";
import { BlogSection } from "../sections/BlogSection";
import { AppFeatures } from "../components/ui/AppFeatures/AppFeatures";
import { NavigationBar } from "../components/navigation/NavigationBar";
import SolariDisplay from "../sections/SolariDisplay";
import ScrollDown from "../components/ScrollDown";
import {
  heroData,
  footerData,
  teamMembers,
  statistics,
  features,
  blogPosts,
} from "../ContentData";

const phrases = [
  "Powering You",
  "Community Centric Commerce",
  "Scaling Local Growing Global",
  "Pioneering Big Small Business",
  "Fueling Small Business Success",
];

const HomePage = () => {
  const location = useLocation();

  useEffect(() => {
    const scrollTo = (location.state as { scrollTo?: string })?.scrollTo;
    if (scrollTo) {
      setTimeout(() => {
        const section = document.getElementById(scrollTo);
        if (section) {
          const yOffset = window.innerWidth < 768 ? -100 : 0;
          const yPosition = section.getBoundingClientRect().top + window.scrollY + yOffset;
          window.scrollTo({ top: yPosition, behavior: "smooth" });
        }
      }, 100); // Small delay to ensure DOM is ready
    }
  }, [location.state]);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationBar />
      <SolariDisplay phrases={phrases} speed={100} phraseDelay={4000} />
      <ScrollDown />
      <HeroSection {...heroData} />
      <FeaturesSection features={features} />
      <AppFeatures />
      <StatisticsSection statistics={statistics} />
      <BlogSection blogPosts={blogPosts} />
      <TeamSection teamMembers={teamMembers} />
      <Footer {...footerData} />
    </div>
  );
};

export default HomePage;