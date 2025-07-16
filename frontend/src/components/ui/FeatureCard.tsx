import React from "react";
import { FeatureCardProps } from "../../types/componentTypes";

// Feature Card Component
export const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
}) => {
  const systemFontStack = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'";

  return (
    <div
      style={{
        background: "rgba(255, 255, 255, 0.9)",
        borderRadius: "1.5rem",
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.05), 0 4px 12px rgba(0, 0, 0, 0.03)",
        padding: "2.5rem",
        transition: "all 0.3s ease",
        willChange: "transform, box-shadow",
        cursor: "pointer",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        fontFamily: systemFontStack,
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-8px)";
        e.currentTarget.style.boxShadow = "0 20px 40px rgba(0, 0, 0, 0.1), 0 8px 20px rgba(0, 0, 0, 0.06)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 10px 25px rgba(0, 0, 0, 0.05), 0 4px 12px rgba(0, 0, 0, 0.03)";
      }}
    >
      {/* Subtle gradient overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "1px",
          background: "linear-gradient(90deg, transparent, rgba(222, 23, 133, 0.3), transparent)",
        }}
      />
      
      {/* Icon container with modern styling */}
      <div
        style={{
          width: "4rem",
          height: "4rem",
          borderRadius: "1rem",
          background: "linear-gradient(135deg, rgba(222, 23, 133, 0.1), rgba(244, 114, 182, 0.05))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "2rem",
          border: "1px solid rgba(222, 23, 133, 0.1)",
        }}
      >
        <img
          src={icon}
          alt=""
          style={{ 
            width: "2rem", 
            height: "2rem",
            filter: "contrast(1.1) saturate(1.1)"
          }}
          aria-hidden="true"
        />
      </div>

      <h3
        style={{
          fontSize: "1.375rem",
          fontWeight: 600,
          color: "#1F2937",
          marginBottom: "1rem",
          lineHeight: 1.3,
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h3>
      
      <p 
        style={{ 
          color: "#4B5563", 
          lineHeight: 1.6,
          fontSize: "1rem",
          margin: 0,
        }}
      >
        {description}
      </p>
    </div>
  );
};

// Features Section Component
interface FeaturesProps {
  features: {
    icon: string;
    title: string;
    description: string;
  }[];
}

function useResponsiveGrid() {
  const [isMd, setIsMd] = React.useState(
    typeof window !== 'undefined' ? window.innerWidth >= 768 : false
  );
  
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => setIsMd(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  
  return isMd;
}

export const FeaturesSection: React.FC<FeaturesProps> = ({ features }) => {
  const isMd = useResponsiveGrid();
  const systemFontStack = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'";

  const sectionStyle: React.CSSProperties = {
    paddingTop: "8rem",
    paddingBottom: "8rem",
    background: "linear-gradient(to bottom, #FFFFFF, #F9FAFB)",
    position: "relative",
    fontFamily: systemFontStack,
    overflow: "hidden",
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: "1280px",
    margin: "0 auto",
    paddingLeft: "2rem",
    paddingRight: "2rem",
    position: "relative",
    zIndex: 10,
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
    <section style={sectionStyle} id="what-we-do">
      {/* Background decoration */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          right: "-10%",
          width: "400px",
          height: "400px",
          background: "radial-gradient(circle, rgba(222, 23, 133, 0.03) 0%, transparent 70%)",
          borderRadius: "50%",
          zIndex: 1,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          left: "-15%",
          width: "500px",
          height: "500px",
          background: "radial-gradient(circle, rgba(59, 130, 246, 0.02) 0%, transparent 70%)",
          borderRadius: "50%",
          zIndex: 1,
        }}
      />

      <div style={containerStyle}>
        {/* Section header */}
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
            What We Do
          </p>
          <h2
            style={{
              fontSize: "3rem",
              fontWeight: 700,
              color: "#1F2937",
              lineHeight: 1.1,
              margin: "0 0 1.5rem 0",
              letterSpacing: "-0.02em",
              maxWidth: "800px",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Everything you need to{" "}
            <span
              style={{
                background: "linear-gradient(to right, #DE1785, #F472B6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              grow your business
            </span>
          </h2>
          <p
            style={{
              fontSize: "1.25rem",
              color: "#4B5563",
              lineHeight: 1.6,
              maxWidth: "600px",
              margin: "0 auto",
            }}
          >
            Powerful tools and intelligent automation that work together seamlessly
          </p>
        </div>

        {/* Features grid */}
        <div style={isMd ? gridMdStyle : gridStyle}>
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
};