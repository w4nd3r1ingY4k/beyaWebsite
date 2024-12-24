import React from "react";
import { HeroSectionProps } from "../ComponentTypes";
import { AppDownload } from "../components/ui/AppDownload";

export const HeroSection: React.FC<HeroSectionProps> = ({
  title,
  description,
  appDownload,
  heroImage,
}) => (
  <section className="relative bg-gradient-to-r from-brandPink to-pink-600 py-20">
    <div className="container mx-auto px-4">
      <div className="flex flex-wrap items-center justify-between">

        {/* Text Section with White Box */}
        <div className="w-full lg:w-1/2 px-6">
          <div className="bg-white p-10 rounded-lg shadow-lg lg:ml-10">
            <h1 className="text-5xl font-bold mb-6 text-gray-900">{title}</h1>
            <p className="text-xl mb-10 text-gray-700">{description}</p>
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">Download App Now</h2>
              <AppDownload {...appDownload} />
            </div>
          </div>
        </div>

        {/* Image Section - Resize Image */}
        <div className="w-full lg:w-1/2 px-8">
  <img
    src={heroImage}
    alt="App preview"
    className="w-1/2 h-auto object-contain rounded-lg ml-[100px]"
  />
</div>
      </div>
    </div>
  </section>
);
