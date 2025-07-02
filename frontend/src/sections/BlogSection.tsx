import React from "react";
import { BlogPost } from "../components/BlogPost";

interface BlogProps {
  blogPosts: {
    image: string;
    title: string;
    description: string;
    href: string;
    imageAlt: string;
  }[];
}

function useResponsiveGrid() {
  const [isMd, setIsMd] = React.useState(
    typeof window !== 'undefined' ? window.innerWidth >= 768 : false
  );
  
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const onResize = () => setIsMd(window.innerWidth >= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  
  return isMd;
}

export const BlogSection: React.FC<BlogProps> = ({ blogPosts }) => {
  const isMd = useResponsiveGrid();
  const systemFontStack = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'";

  const sectionStyle: React.CSSProperties = {
    padding: "8rem 0",
    background: "linear-gradient(135deg, #F9FAFB 0%, #FFFFFF 50%, #F3F4F6 100%)",
    position: "relative",
    overflow: "hidden",
    fontFamily: systemFontStack,
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: "1280px",
    margin: "0 auto",
    padding: "0 2rem",
    position: "relative",
    zIndex: 10,
  };

  const headingStyle: React.CSSProperties = {
    fontSize: "3rem",
    fontWeight: 700,
    textAlign: "center",
    marginBottom: "1.5rem",
    color: "#1F2937",
    letterSpacing: "-0.02em",
    lineHeight: 1.1,
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: "1.25rem",
    color: "#4B5563",
    textAlign: "center",
    marginBottom: "4rem",
    lineHeight: 1.6,
    maxWidth: "600px",
    margin: "0 auto 4rem auto",
  };

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "2.5rem",
  };

  const gridMdStyle: React.CSSProperties = {
    ...gridStyle,
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "3rem",
  };

  return (
    <section style={sectionStyle} id="blog">
      {/* Background decorative elements */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          right: "-5%",
          width: "300px",
          height: "300px",
          background: "radial-gradient(circle, rgba(222, 23, 133, 0.04) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(60px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "15%",
          left: "-8%",
          width: "400px",
          height: "400px",
          background: "radial-gradient(circle, rgba(59, 130, 246, 0.03) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(80px)",
        }}
      />

      <div style={containerStyle}>
        {/* Section Header */}
        <div style={{ textAlign: "center", marginBottom: "5rem" }}>
          <p
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.075em",
              color: "#DE1785",
              margin: "0 0 1.5rem 0",
            }}
          >
            Insights & Updates
          </p>
          <h2 style={headingStyle}>
            Latest from{" "}
            <span
              style={{
                background: "linear-gradient(to right, #DE1785, #F472B6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              our blog
            </span>
          </h2>
          <p style={subtitleStyle}>
            Stay updated with the latest trends, insights, and best practices in AI-powered business automation
          </p>
        </div>

        {/* Blog Posts Grid */}
        <div style={isMd ? gridMdStyle : gridStyle}>
          {blogPosts.map((post, index) => (
            <BlogPost key={index} {...post} />
          ))}
        </div>
      </div>
    </section>
  );
};