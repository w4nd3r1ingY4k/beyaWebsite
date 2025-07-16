import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Footer } from "@/components/Footer";
import { HeroSection } from "@/sections/HeroSection";
import { BeyaFeaturesSection } from "@/sections/BeyaFeaturesSection";
import { TeamSection } from "@/sections/TeamSection";
import { BlogSection } from "@/sections/BlogSection";
import { NavigationBar } from "@/components/navigation/NavigationBar";
import ScrollDown from "@/components/ScrollDown";
import {
  heroData,
  footerData,
  teamMembers,
  blogPosts,
} from "@/ContentData";

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
    <div className="min-h-screen bg-red-500 width-full overflow-x-hidden">
      <NavigationBar />
      <ScrollDown />
      <HeroSection {...heroData} />
      <BeyaFeaturesSection />
      <BlogSection blogPosts={blogPosts} />
      <TeamSection teamMembers={teamMembers} />
      <Footer {...footerData} />
    </div>
  );
};

export default HomePage;