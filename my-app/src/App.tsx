import { Footer } from "./components/Footer";
import { FeaturesSection } from "./sections/FeaturesSection";
import { HeroSection } from "./sections/HeroSection";
import { StatisticsSection } from "./sections/StatisticsSection";
import { TeamSection } from "./sections/TeamSection";
import { BlogSection } from "./sections/BlogSection";
import { AppFeatures } from "./components/ui/AppFeatures";
import { NavigationBar } from "./components/navigation/NavigationBar";
import { heroData, footerData, teamMembers } from "./ContentData";


function App() {
  
      return (
    <div className="min-h-screen bg-gray-50">
      <NavigationBar/>
      <HeroSection {...heroData} />
      {/* <FeaturesSection features={features} />
      <AppFeatures />
      <StatisticsSection statistics={statistics} />
      <BlogSection blogPosts={blogPosts} />  */}
      <TeamSection teamMembers={teamMembers} />
      <Footer {...footerData} />
    </div>
  );
  };
  

export default App;
