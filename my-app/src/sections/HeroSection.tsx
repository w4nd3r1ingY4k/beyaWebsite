import React from "react";
import { HeroSectionProps } from "../ComponentTypes";
import { AppDownload } from "../components/ui/AppDownload";
import { motion } from "framer-motion";

const isGreyedOut = true;

// parent controls the staggering
const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3,
    },
  },
};

// each child fades in + slides up
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export const HeroSection: React.FC<HeroSectionProps> = ({
  title,
  description,
  appDownload,
  heroImage,
}) => (
  <section
    className="relative bg-gradient-to-b from-pink-500 to-brandPink py-40"
    id="mission"
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
        </div>

        {/* Image Section */}
        <div className="w-full sm:px-6 sm:w-2/3 lg:w-1/2 px-4 flex justify-center">
          <img
            src={heroImage}
            alt="App preview"
            className="w-3/4 sm:w-2/3 md:w-1/2 h-auto max-h-[500px] object-contain rounded-lg"
          />
        </div>
      </div>
    </div>
  </section>
);
