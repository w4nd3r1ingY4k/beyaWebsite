import React from "react";
import { SocialLink } from "./SocialLink";
import { AppDownload } from "./AppDownload";
import { NavLink } from "./NavLink";
import { HeroSection } from "../sections/HeroSection";
import { FeatureCard } from "./FeatureCard";
import { Statistic } from "./Statistic";
import { TeamMember } from "./TeamMember";
import { BlogPost } from "./BlogPost";
import { Footer } from "./Footer";

export const LandingPage: React.FC = () => {
  const heroData = {
    title: "A Great App Makes Your Life Better",
    description:
      "Amet minim mollit non deserunt ullamco est sit aliqua dolor do amet sint. Velit officia consequat duis enim velit mollit. Exercitation veniam consequat sunt nostrud amet.",
    appDownload: {
      googlePlayLink: "https://play.google.com",
      appStoreLink: "https://apps.apple.com",
      googlePlayImage:
        "https://cdn.builder.io/api/v1/image/assets/TEMP/f1f2f9d99d818f1b63543671ca666a70430c78e7b79c25301c2249c51ee0bc20?placeholderIfAbsent=true&apiKey=81df03e36d684043a7cd51a4520bc0ac",
      appStoreImage:
        "https://cdn.builder.io/api/v1/image/assets/TEMP/55587a083e14666c47a60f1e7df7fab553ef5b29b0ea123c36d46cc8bb821941?placeholderIfAbsent=true&apiKey=81df03e36d684043a7cd51a4520bc0ac",
    },
    heroImage:
      "https://cdn.builder.io/api/v1/image/assets/TEMP/4bc9c6ef8f02cf4857ad3a92384b59f255cc525a63b0305e6fe87e938233c30d?placeholderIfAbsent=true&apiKey=81df03e36d684043a7cd51a4520bc0ac",
  };

  const features = [
    {
      icon: "https://cdn.builder.io/api/v1/image/assets/TEMP/cf4a5bb94a24087191853277e7f4cd0828359d4e3ffba5b0e5f37b7fbe837c63?placeholderIfAbsent=true&apiKey=81df03e36d684043a7cd51a4520bc0ac",
      title: "Creative design",
      description:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Viverra nunc ante velit vitae.",
    },
    {
      icon: "https://cdn.builder.io/api/v1/image/assets/TEMP/b094be3de1a6fd40dbb60cd5b10cf858b2097714f6bd48f2020e9397b85c8c48?placeholderIfAbsent=true&apiKey=81df03e36d684043a7cd51a4520bc0ac",
      title: "Easy to use",
      description:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Viverra nunc ante velit vitae.",
    },
    {
      icon: "https://cdn.builder.io/api/v1/image/assets/TEMP/d18d29f10622baae767d5b30373cb44387881242a33273a047e3a3954e941eca?placeholderIfAbsent=true&apiKey=81df03e36d684043a7cd51a4520bc0ac",
      title: "Best user experience",
      description:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Viverra nunc ante velit vitae.",
    },
  ];

  const statistics = [
    {
      icon: "https://cdn.builder.io/api/v1/image/assets/TEMP/14627ade3fa523e041a7311a7aad5b0fe2020d4467c4e2eca593b6fa4485f57d?placeholderIfAbsent=true&apiKey=81df03e36d684043a7cd51a4520bc0ac",
      value: "59865",
      label: "Downloads",
    },
    {
      icon: "https://cdn.builder.io/api/v1/image/assets/TEMP/0c6ae750a3805e94138b26c0b7baced95c9a6da3fefb4b01a605c768f38c0a47?placeholderIfAbsent=true&apiKey=81df03e36d684043a7cd51a4520bc0ac",
      value: "29852",
      label: "Likes",
    },
    {
      icon: "https://cdn.builder.io/api/v1/image/assets/TEMP/b435b07f81af71041a60a3a36df60b852f42e0e02633bab6bcdf210282aa1ac8?placeholderIfAbsent=true&apiKey=81df03e36d684043a7cd51a4520bc0ac",
      value: "1500",
      label: "5 star rating",
    },
  ];

  const teamMembers = [
    {
      image:
        "https://cdn.builder.io/api/v1/image/assets/TEMP/e4be770bdc33b99e35e0b2cb452afc5d5bb14ac389f8db25b4aa16e852014542?placeholderIfAbsent=true&apiKey=81df03e36d684043a7cd51a4520bc0ac",
      name: "Carla Press",
      role: "UI/UX Designer",
      description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      socialLinks: [
        {
          icon: "http://b.io/social-1",
          href: "#",
          text: "Twitter",
          ariaLabel: "Follow Carla on Twitter",
        },
      ],
    },
  ];

  const blogPosts = [
    {
      image:
        "https://cdn.builder.io/api/v1/image/assets/TEMP/03a0e7fa0bf40ae1aea342c90ebbbe728aefca502143cfafb5adeb0053019a7d?placeholderIfAbsent=true&apiKey=81df03e36d684043a7cd51a4520bc0ac",
      title: "The Snap Pixel: How It Works and How to Install",
      description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      href: "#",
      imageAlt: "Snap Pixel blog post",
    },
  ];

  const footerData = {
    logo: "http://b.io/logo",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    socialLinks: [
      {
        icon: "https://cdn.builder.io/api/v1/image/assets/TEMP/bc92248466791d4dd34da0cb79c7e53c5956555af5212e86809cb59928e72800?placeholderIfAbsent=true&apiKey=81df03e36d684043a7cd51a4520bc0ac",
        text: "Info@youremail.com",
        href: "mailto:info@youremail.com",
        ariaLabel: "Email us",
      },
    ],
    quickLinks: [
      {
        href: "#",
        text: "Home",
        isActive: true,
      },
      {
        href: "#about",
        text: "About",
      },
    ],
    newsletterTitle: "Newsletter",
    newsletterDescription: "Subscribe to our newsletter for updates",
    copyrightText: "Copyright 2024. All Rights Reserved.",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-indigo-600">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-8">
              <SocialLink
                icon="https://cdn.builder.io/api/v1/image/assets/TEMP/bc92248466791d4dd34da0cb79c7e53c5956555af5212e86809cb59928e72800?placeholderIfAbsent=true&apiKey=81df03e36d684043a7cd51a4520bc0ac"
                text="Info@youremail.com"
                href="mailto:info@youremail.com"
                ariaLabel="Email us"
              />
              <SocialLink
                icon="https://cdn.builder.io/api/v1/image/assets/TEMP/9aa51f778c5227a5a003590f4e6c3f6376e293a47c328bdf865f8c364377ecd0?placeholderIfAbsent=true&apiKey=81df03e36d684043a7cd51a4520bc0ac"
                text="(480) 555-0103"
                href="tel:4805550103"
                ariaLabel="Call us"
              />
            </div>
          </div>
        </div>
      </header>

      <nav className="sticky top-0 bg-white shadow-sm z-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-20">
            <div className="flex gap-8">
              {footerData.quickLinks.map((link, index) => (
                <NavLink key={index} {...link} />
              ))}
            </div>
            <AppDownload {...heroData.appDownload} />
          </div>
        </div>
      </nav>

      <main>
        <HeroSection {...heroData} />

        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <FeatureCard key={index} {...feature} />
              ))}
            </div>
          </div>
        </section>

        <section className="bg-indigo-600 py-20">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {statistics.map((statistic, index) => (
                <Statistic key={index} {...statistic} />
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Our Team</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {teamMembers.map((member, index) => (
                <TeamMember key={index} {...member} />
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">
              Latest Blog Posts
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {blogPosts.map((post, index) => (
                <BlogPost key={index} {...post} />
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer {...footerData} />
    </div>
  );
};
