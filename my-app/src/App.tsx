import { Footer } from "./components/Footer";
import { FeaturesSection } from "./sections/FeaturesSection";
import { HeroSection } from "./sections/HeroSection";
import { StatisticsSection } from "./sections/StatisticsSection";
import { TeamSection } from "./sections/TeamSection";
import { BlogSection } from "./sections/BlogSection";
import { AppFeatures } from "./components/ui/AppFeatures/AppFeatures";
import { NavigationBar } from "./components/navigation/NavigationBar";
import SolariDisplay from "./sections/SolariDisplay";
import { heroData, footerData, teamMembers, statistics, features, blogPosts } from "./ContentData";
const phrases = [
  "Powering You",
  "Community Centric Commerce",
  "Powering Localized Scale",
  "Pioneering Big Small Business",
  "Empowering Small Business Owners",
];

function App() {

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationBar />
      <SolariDisplay phrases={phrases} speed={100} phraseDelay={4000} />
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


export default App;
