import React from "react";
import { HeroSectionProps } from "../ComponentTypes";

const desktop = require("../pages/webApp/Assets/Media/desktop.png");
const mobile = require("../pages/webApp/Assets/Media/mobile.png");


export const HeroSection: React.FC<HeroSectionProps> = () => {
  const systemFontStack =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'";

  return (
    <section
      style={{
        marginTop: -30,
        width: "100%",
        minHeight: "98vh",
        position: "relative",
        background: "linear-gradient(to bottom, #F9FAFB, #FFFFFF)",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        fontFamily: systemFontStack,
      }}
    >
      <div
        style={{
          maxWidth: "80rem",
          margin: "0 auto",
          padding: "6rem 2rem",
          width: "100%",
          position: "relative",
          zIndex: 20,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "8rem",
            alignItems: "center",
          }}
        >
          {/* Text Content */}
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            <p
              style={{
                fontSize: "1.05rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.075em",
                color: "#DE1785",
                margin: 0,
              }}
            >
              Powering You
            </p>

            {/* Updated H1: Each half is its own block to guarantee a two-line layout */}
            <h1
  style={{
    fontSize: "4.25rem",
    fontWeight: 700,
    color: "#1F2937",
    lineHeight: 1.1,
    margin: 0,
    letterSpacing: "-0.03em",
    display: "flex",
    flexDirection: "column",
  }}
>
  <span>Business runs on</span>
  <span
    style={{
      background: "linear-gradient(to right, #DE1785, #F472B6)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
      color: "transparent",
    }}
  >
    one conversation
  </span>
</h1>

            <p
              style={{
                fontSize: "1.375rem",
                color: "#4B5563",
                fontWeight: 400,
                maxWidth: "38rem",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              AI that understands your business. Commerce and marketing tools that just work. All in one place.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.85rem", marginTop: "1rem" }}>
              {["AI-Powered Commerce", "Unified Dashboard", "Natural Language Control"].map((text, index) => (
                <div
                  key={index}
                  style={{
                    padding: "0.65rem 1.3rem",
                    background: "rgba(255, 255, 255, 0.8)",
                    borderRadius: "9999px",
                    fontSize: "0.95rem",
                    color: "#374151",
                    border: "1px solid rgba(229, 231, 235, 0.6)",
                    fontWeight: 500,
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                  }}
                >
                  {text}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginTop: "1.5rem" }}>
              <button
                style={{
                  padding: "1.2rem 2.6rem",
                  color: "#fff",
                  fontWeight: 600,
                  borderRadius: "9999px",
                  background: "linear-gradient(135deg, #DE1785, #F472B6)",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: "0 10px 25px rgba(222, 23, 133, 0.25), 0 4px 12px rgba(0, 0, 0, 0.05)",
                  alignSelf: "flex-start",
                  fontSize: "1.1rem",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 15px 35px rgba(222, 23, 133, 0.35), 0 8px 20px rgba(0, 0, 0, 0.1)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 10px 25px rgba(222, 23, 133, 0.25), 0 4px 12px rgba(0, 0, 0, 0.05)";
                }}
              >
                Get Early Access
              </button>
              <p style={{ fontSize: "0.95rem", color: "#6B7280", margin: 0 }}>
                For businesses ready to grow smarter
              </p>
            </div>
          </div>

          {/* Visual Element - Redesigned */}
          <div
            style={{
              position: "relative",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "750px",
              perspective: "1500px",
            }}
          >
            {/* Desktop Image - Main focal point */}
            <div
              style={{
                position: "relative",
                zIndex: 10,
                transform: "rotateY(-5deg) rotateX(2deg)",
                transformStyle: "preserve-3d",
              }}
            >
              <img
                src={desktop}
                alt="Desktop app preview"
                style={{
                  width: "800px",
                  height: "500px",
                  borderRadius: "18px",
                  boxShadow: "0 35px 70px rgba(0, 0, 0, 0.18), 0 14px 35px rgba(0, 0, 0, 0.12)",
                  border: "2px solid rgba(255, 255, 255, 0.25)",
                  background: "#fff",
                  objectFit: "fill",
                }}
              />
            </div>

            {/* Mobile Image - Positioned to the right and slightly forward */}
            <div
              style={{
                position: "absolute",
                right: "-100px",
                bottom: "40px",
                zIndex: 15,
                transform: "rotateY(-15deg) rotateX(5deg) translateZ(50px)",
                transformStyle: "preserve-3d",
              }}
            >
              <img
                src={mobile}
                alt="Mobile app preview"
                style={{
                  width: "250px", // iPhone scale (larger)
                  height: "500px", // maintain 2:1 iPhone-like aspect
                  borderRadius: "32px",
                  boxShadow: "0 24px 48px rgba(0, 0, 0, 0.22), 0 10px 24px rgba(0, 0, 0, 0.12)",
                  border: "4px solid #fff",
                  background: "#fff",
                  objectFit: "fill",
                }}
              />
            </div>

            {/* Subtle floating elements */}
            <div
              style={{
                position: "absolute",
                top: "-20px",
                right: "30px",
                width: "120px",
                height: "120px",
                background: "linear-gradient(135deg, rgba(222, 23, 133, 0.1), rgba(244, 114, 182, 0.1))",
                borderRadius: "50%",
                filter: "blur(40px)",
                zIndex: 1,
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "-40px",
                left: "-30px",
                width: "160px",
                height: "160px",
                background: "linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(147, 197, 253, 0.08))",
                borderRadius: "50%",
                filter: "blur(50px)",
                zIndex: 1,
              }}
            />

            {/* Additional depth elements */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%) translateZ(-100px)",
                width: "400px",
                height: "400px",
                background: "radial-gradient(circle, rgba(222, 23, 133, 0.03) 0%, transparent 70%)",
                borderRadius: "50%",
                zIndex: 0,
              }}
            />
          </div>
        </div>

        {/* Trust indicators */}
        <div
          style={{
            marginTop: "9rem",
            paddingTop: "5rem",
            borderTop: "1px solid rgba(229, 231, 235, 0.6)",
          }}
        >
          <p
            style={{
              textAlign: "center",
              fontSize: "0.95rem",
              color: "#6B7280",
              marginBottom: "3.5rem",
              marginTop: 0,
              fontWeight: 500,
            }}
          >
            Trusted by forward-thinking businesses
          </p>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "4.5rem",
              opacity: 0.5,
              flexWrap: "wrap",
            }}
          >
            {[1, 2, 3, 4].map((_, index) => (
              <div
                key={index}
                style={{
                  width: "9.5rem",
                  height: "3.75rem",
                  background: "linear-gradient(135deg, #E5E7EB, #D1D5DB)",
                  borderRadius: "0.65rem",
                  border: "1px solid rgba(229, 231, 235, 0.3)",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};