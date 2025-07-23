import React, { useState } from 'react';
import styles from '../styles/BeyaFeaturesSection.module.css';

export const BeyaFeaturesSection = () => {
  const [activeTab, setActiveTab] = useState(0);

  const features = [
    {
      id: 'ai-commerce',
      title: 'Communication',
      subtitle: 'Connect with your customers and collect payments',
      description: "Beya's AI understands your customers, predicts trends, and automates your entire sales funnel. From product recommendations to inventory management, let artificial intelligence handle the complexity while you focus on strategy.",
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop&crop=entropy&auto=format&q=80',
      benefits: [
        'Smart product recommendations that increase sales by 35%',
        'Automated inventory management and demand forecasting',
        'Personalized customer journeys that convert better',
        'Real-time analytics and performance optimization'
      ]
    },
    {
      id: 'unified-dashboard',
      title: 'Commerce',
      subtitle: 'Everything in its right place',
      description: 'Stop juggling multiple tools and platforms. Beya brings together sales, marketing, customer service, and analytics into one intuitive dashboard that gives you complete visibility and control over your business.',
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop&crop=entropy&auto=format&q=80',
      benefits: [
        'Centralized view of all business operations',
        'Real-time collaboration across teams',
        'Integrated reporting and analytics',
        'Seamless workflow automation between departments'
      ]
    },
    {
      id: 'natural-language',
      title: 'Intelligence',
      subtitle: 'Control your business with one conversation',
      description: 'Skip complex interfaces and technical barriers. Simply tell Beya what you want to accomplish in plain English, and watch it execute your commands. From generating reports to launching campaigns, business management has never been this intuitive.',
      image: 'https://images.unsplash.com/photo-1589254065878-42c9da997008?w=600&h=400&fit=crop&crop=entropy&auto=format&q=80',
      benefits: [
        'Voice and text commands for any business task',
        'No technical training required for your team',
        'Instant report generation and data analysis',
        'Smart suggestions based on your business goals'
      ]
    }
  ];

  return (
    <section id="features" className={styles.section}>
      {/* Background decorative elements */}
      <div className={styles.bgDecor1} />
      <div className={styles.bgDecor2} />
      <div className={styles.container}>
        {/* Section Header */}
        <div className={styles.header}>
          <p className={styles.headerLabel}>How Beya Works</p>
          <h2 className={styles.headerTitle}>
            How we{' '}
            <span className={styles.headerTitleAccent}>power</span>{' '}
            your business
          </h2>
          <p className={styles.headerSubtitle}>
            Discover how Beya's innovative approach to business automation can revolutionize the way you work
          </p>
        </div>
        {/* Tab Navigation */}
        <div className={styles.tabNav}>
          {features.map((feature, index) => (
            <button
              key={feature.id}
              onClick={() => setActiveTab(index)}
              className={
                activeTab === index
                  ? styles.tabButtonActive
                  : styles.tabButton
              }
              onMouseEnter={e => {
                if (activeTab !== index) {
                  e.currentTarget.classList.add(styles.tabButtonHover);
                }
              }}
              onMouseLeave={e => {
                if (activeTab !== index) {
                  e.currentTarget.classList.remove(styles.tabButtonHover);
                }
              }}
            >
              {feature.title}
            </button>
          ))}
        </div>
        {/* Content Area */}
        <div className={styles.contentArea}>
          {/* Top accent line */}
          <div className={styles.topAccentLine} />
          <div className={styles.contentGrid}>
            {/* Text Content */}
            <div style={{ order: activeTab === 1 ? 2 : 1 }}>
              <h3 className={styles.featureTitle}>{features[activeTab].title}</h3>
              <p className={styles.featureSubtitle}>{features[activeTab].subtitle}</p>
              <p className={styles.featureDescription}>{features[activeTab].description}</p>
              {/* Benefits List */}
              <div className={styles.benefitsList}>
                {features[activeTab].benefits.map((benefit, index) => (
                  <div key={index} className={styles.benefitItem}>
                    <div className={styles.benefitIconWrapper}>
                      <div className={styles.benefitIconDot} />
                    </div>
                    <span className={styles.benefitText}>{benefit}</span>
                  </div>
                ))}
              </div>
              {/* CTA Button */}
              <button
                className={styles.ctaButton}
                onMouseEnter={e => {
                  e.currentTarget.classList.add(styles.ctaButtonHover);
                }}
                onMouseLeave={e => {
                  e.currentTarget.classList.remove(styles.ctaButtonHover);
                }}
              >
                Learn More
              </button>
            </div>
            {/* Image */}
            <div style={{ order: activeTab === 1 ? 1 : 2 }}>
              <div className={styles.imageWrapper}>
                <img
                  src={features[activeTab].image}
                  alt={features[activeTab].title}
                  className={styles.featureImage}
                />
                {/* Image overlay */}
                <div className={styles.imageOverlay} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}