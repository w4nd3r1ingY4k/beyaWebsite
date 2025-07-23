import React, { useState } from 'react';
import styles from '../styles/OnlyOnBeyaSection.module.css';

export const OnlyOnBeyaSection = () => {
  const [activeTab, setActiveTab] = useState(0);

  const features = [
    {
      id: 'payments-conversations',
      title: 'Seamlessly integrate payments into your conversations',
      description: "Accept payments directly within customer conversations without breaking the flow. Whether it's email, chat, or any communication channel, Beya makes transactions feel natural and effortless.",
      image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&h=400&fit=crop&crop=entropy&auto=format&q=80',
      benefits: [
        'One-click payments in any conversation',
        'Secure transactions without leaving the chat',
        'Automatic invoice generation and tracking',
        'Support for multiple payment methods and currencies'
      ]
    },
    {
      id: 'proactive-advice',
      title: 'Get proactive and intelligent business advice',
      description: 'Beya doesn\'t just respond to your queries—it actively monitors your business and provides intelligent recommendations before you even ask. Get insights that help you stay ahead of the competition.',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop&crop=entropy&auto=format&q=80',
      benefits: [
        'AI-powered business insights and recommendations',
        'Predictive analytics for better decision making',
        'Automated alerts for important business metrics',
        'Strategic advice tailored to your industry'
      ]
    },
    {
      id: 'world-class-ai',
      title: 'Take care of business by talking to world class AI models',
      description: 'Manage your entire business through natural conversation with cutting-edge AI. From complex analytics to strategic planning, simply describe what you need and watch Beya execute with precision.',
      image: 'https://images.unsplash.com/photo-1589254065878-42c9da997008?w=600&h=400&fit=crop&crop=entropy&auto=format&q=80',
      benefits: [
        'Natural language commands for any business task',
        'Integration with leading AI models for maximum capability',
        'Context-aware responses based on your business data',
        'Continuous learning from your business patterns'
      ]
    }
  ];

  return (
    <section id="only-on-beya" className={styles.section}>
      {/* Background decorative elements */}
      <div className={styles.bgDecor1} />
      <div className={styles.bgDecor2} />
      <div className={styles.container}>
        {/* Section Header */}
        <div className={styles.header}>
          <p className={styles.headerLabel}>Only on Beya</p>
          <h2 className={styles.headerTitle}>
            Only on <span className={styles.headerTitleAccent}>Beya</span>{' '}
            can you:
          </h2>
          <p className={styles.headerSubtitle}>
            Discover capabilities that you simply can't find anywhere else
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
                e.currentTarget.classList.remove(styles.tabButtonHover);
              }}
            >
              {feature.title}
            </button>
          ))}
        </div>
        {/* Content Area */}
        <div className={styles.content}>
          <div className={styles.contentGrid}>
            {/* Text Content */}
            <div className={styles.textContent}>
              <h3 className={styles.contentTitle}>
                {features[activeTab].title}
              </h3>
              <p className={styles.contentDescription}>
                {features[activeTab].description}
              </p>
              <ul className={styles.benefitsList}>
                {features[activeTab].benefits.map((benefit, index) => (
                  <li key={index} className={styles.benefitItem}>
                    <svg className={styles.checkIcon} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
            {/* Image Content */}
            <div className={styles.imageContent}>
              <div className={styles.imageContainer}>
                <img
                  src={features[activeTab].image}
                  alt={features[activeTab].title}
                  className={styles.featureImage}
                />
                <div className={styles.imageOverlay} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}; 