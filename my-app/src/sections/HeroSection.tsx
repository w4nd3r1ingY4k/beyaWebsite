import React from "react";
import { HeroSectionProps } from "../ComponentTypes";
import { AppDownload } from "../components/AppDownload";

export const HeroSection: React.FC<HeroSectionProps> = ({
  title,
  description,
  appDownload,
  heroImage,
}) => (
  <section className="relative bg-gradient-to-r from-indigo-600 to-indigo-800 py-20">
    <div className="container mx-auto px-4">
      <div className="flex flex-wrap items-center">
        <div className="w-full lg:w-1/2 text-white">
          <h1 className="text-5xl font-bold mb-6">{title}</h1>
          <p className="text-xl mb-10">{description}</p>
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Download App Now</h2>
            <AppDownload {...appDownload} />
          </div>
        </div>
        <div className="w-full lg:w-1/2">
          <img
            src={heroImage}
            alt="App preview"
            className="w-full h-auto rounded-lg shadow-xl"
          />
        </div>
      </div>
    </div>
  </section>
);
