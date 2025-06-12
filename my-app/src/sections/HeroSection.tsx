// src/components/HeroSection.tsx
import React from "react";
import { HeroSectionProps } from "../ComponentTypes";
import styles from "./HeroSection.module.css";

export const HeroSection: React.FC<HeroSectionProps> = () => {
  const desktopSrc = "/assets/media/desktop.png";
  const mobileSrc = "/assets/media/mobile.png";

  return (
    <section className={styles.heroSection}>
      <div className={styles.container}>
        <div className={styles.gridTwo}>
          <div className={styles.textColumn}>
            <p className={styles.preamble}>Powering You</p>
            <h1 className={styles.title}>
              <span>Business runs on</span>
              <span className={styles.titleGradient}>one conversation</span>
            </h1>
            <p className={styles.subtitle}>
              AI that understands your business. Commerce and marketing tools that just work. All in one place.
            </p>
            <div className={styles.tags}>
              {["AI-Powered Commerce", "Unified Dashboard", "Natural Language Control"].map((text, idx) => (
                <div key={idx} className={styles.tag}>
                  {text}
                </div>
              ))}
            </div>
            <div className={styles.actions}>
              <button className={styles.buttonPrimary}>Get Early Access</button>
              <p className={styles.labelSmall}>For businesses ready to grow smarter</p>
            </div>
          </div>
          <div className={styles.visualContainer}>
            <img src={desktopSrc} alt="Desktop app preview" className={styles.desktopImage} />
            <img src={mobileSrc} alt="Mobile app preview" className={styles.mobileImage} />
            <div className={styles.shapeBlur1} />
            <div className={styles.shapeBlur2} />
            <div className={styles.shapeBlur3} />
          </div>
        </div>
        <div className={styles.trustContainer}>
          <p className={styles.trustTitle}>Trusted by forward-thinking businesses</p>
          <div className={styles.trustLogos}>
            {[1, 2, 3, 4].map((_, idx) => (
              <div key={idx} className={styles.logoPlaceholder} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
