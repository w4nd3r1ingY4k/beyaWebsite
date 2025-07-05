import React from "react";
import { HeroSectionProps } from "../ComponentTypes";

const desktop = require("../pages/webApp/assets/media/desktop.png");
const mobile = require("../pages/webApp/assets/media/mobile.png");

<<<<<<< HEAD:my-app/src/sections/HeroSection.tsx
export const HeroSection: React.FC<HeroSectionProps> = ({
  title,
  description,
  appDownload,
  heroImage,
}) => (
  <section
    className="relative bg-gradient-to-b from-pink-500 to-brandPink py-40"
    id="mission"
=======
export const HeroSection: React.FC<HeroSectionProps> = () => {
  const systemFontStack =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'";

  return (
    <section
      id="mission"
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
>>>>>>> main:frontend/src/sections/HeroSection.tsx
  >
    <div className="container mx-auto px-4">
      <div className="flex flex-col-reverse lg:flex-row items-center justify-between">
        {/* Text Section with White Box */}
        <div className="w-full lg:w-1/2 px-4 sm:px-6 sm:w-2/3 lg:px-8 mb-12 lg:mb-0 mt-8 sm:mt-12 lg:mt-0">
          <motion.div
            className="bg-white p-6 sm:p-10 rounded-lg shadow-lg lg:ml-10"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
          >
            <motion.h1
              className="text-3xl sm:text-2xl lg:text-5xl font-bold mb-6 text-gray-900"
              variants={itemVariants}
            >
              {title}
            </motion.h1>

            <motion.p
              className="text-base sm:text-sm lg:text-xl mb-8 text-gray-700"
              variants={itemVariants}
            >
              {description}
            </motion.p>

            <motion.p
              className="text-lg sm:text-base lg:text-xl mb-4 text-gray-700"
              variants={itemVariants}
            >
              <b>
                <a
                  href="https://www.figma.com/proto/qO9vcMMjS1UxcYTYAbOEIQ/UI?page-id=578%3A195&node-id=578-398&viewport=838%2C453%2C0.14&t=rt5qp9FqxhzAbZPG-1&scaling=scale-down&content-scaling=fixed&starting-point-node-id=578%3A398"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline"
                >
                  Wireframe Demo
                </a>
              </b>
              &nbsp; | &nbsp;
              <b>
                <a
                  href="https://calendly.com/akbar-usebeya"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline"
                >
                  Book a Call
                </a>
              </b>
            </motion.p>

<<<<<<< HEAD:my-app/src/sections/HeroSection.tsx
            {/* <motion.div variants={itemVariants} className="mb-8">
              <a
                href="#beta"
                target="_blank"
                rel="noopener noreferrer"
                className="
                  inline-block 
                  bg-indigo-600 hover:bg-indigo-700 
                  text-white 
                  font-semibold 
                  py-3 px-6 
                  rounded-lg 
                  text-lg sm:text-base lg:text-xl 
                  transition-colors duration-200
                "
              >
                Join Our Beta Testing
              </a>
            </motion.div> */}

            {/* (existing AppDownload block commented out) */}
            <motion.div variants={itemVariants} className="mb-8">
              <h2
                className={`text-xl sm:text-2xl font-semibold mb-4 ${
                  isGreyedOut ? "text-gray-400" : "text-gray-900"
                }`}
              >
                Download App (Coming Soon)
              </h2>
              <div className={isGreyedOut ? "greyed-out" : ""}>
                <AppDownload {...appDownload} />
              </div>
            </motion.div>
          </motion.div>
=======
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
>>>>>>> main:frontend/src/sections/HeroSection.tsx
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