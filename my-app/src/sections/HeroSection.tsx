import React from "react";
import { HeroSectionProps } from "../ComponentTypes";
import { AppDownload } from "../components/ui/AppDownload";

const isGreyedOut = true;

export const HeroSection: React.FC<HeroSectionProps> = ({
  title,
  description,
  appDownload,
  heroImage,
}) => (
  <section className="relative bg-gradient-to-r from-brandPink to-pink-600 py-20" id="mission">
    <div className="container mx-auto px-4">
      <div className="flex flex-col-reverse lg:flex-row items-center justify-between">

        {/* Text Section with White Box */}
        <div className="w-full lg:w-1/2 px-4 sm:px-6 sm:w-2/3 lg:px-8 mb-12 lg:mb-0 mt-8 sm:mt-12 lg:mt-0">
          <div className="bg-white p-6 sm:p-10 rounded-lg shadow-lg lg:ml-10">
            <h1 className="text-3xl sm:text-2xl lg:text-5xl font-bold mb-6 text-gray-900">
              {title}
            </h1>
            <p className="text-base sm:text-sm lg:text-xl mb-8 text-gray-700">
              {description}
            </p>
            <div className="mb-8">
              <h2
                className={`text-xl sm:text-2xl font-semibold mb-4 ${isGreyedOut ? 'text-gray-400' : 'text-gray-900'
                  }`}
              >
                Download App Now(Soon)
              </h2>
              <div className={isGreyedOut ? 'greyed-out' : ''}>
                <AppDownload {...appDownload} />
              </div>
            </div>
          </div>
        </div>

        {/* Image Section - Resize Image */}
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
