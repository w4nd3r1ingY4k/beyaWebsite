import React, { useState } from 'react';

export const BeyaFeaturesSection = () => {
  const [activeTab, setActiveTab] = useState(0);
  const systemFontStack = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'";

  const features = [
    {
      id: 'ai-commerce',
      title: 'CRM and Commerce',
      subtitle: 'Connect with your customers and collect payments',
      description: 'Beya\'s AI understands your customers, predicts trends, and automates your entire sales funnel. From product recommendations to inventory management, let artificial intelligence handle the complexity while you focus on strategy.',
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
      title: 'Unified Dashboard',
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
      title: 'Natural Language Control',
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
    <section
      style={{
        padding: '8rem 0',
        background: 'linear-gradient(to bottom, #F9FAFB, #FFFFFF)',
        fontFamily: systemFontStack,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background decorative elements */}
      <div
        style={{
          position: 'absolute',
          top: '15%',
          left: '-8%',
          width: '350px',
          height: '350px',
          background: 'radial-gradient(circle, rgba(222, 23, 133, 0.04) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(60px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '20%',
          right: '-10%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.03) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(80px)',
        }}
      />

      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 2rem',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <p
            style={{
              fontSize: '1rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.075em',
              color: '#DE1785',
              margin: '0 0 1.5rem 0',
            }}
          >
            How Beya Works
          </p>
          <h2
            style={{
              fontSize: '3.5rem',
              fontWeight: 700,
              color: '#1F2937',
              lineHeight: 1.1,
              margin: '0 0 1.5rem 0',
              letterSpacing: '-0.02em',
              maxWidth: '800px',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            How we{' '}
            <span
              style={{
                background: 'linear-gradient(to right, #DE1785, #F472B6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              power
            </span>{' '}
            your business
          </h2>
          <p
            style={{
              fontSize: '1.25rem',
              color: '#4B5563',
              lineHeight: 1.6,
              maxWidth: '700px',
              margin: '0 auto',
            }}
          >
            Discover how Beya's innovative approach to business automation can revolutionize the way you work
          </p>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '4rem',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          {features.map((feature, index) => (
            <button
              key={feature.id}
              onClick={() => setActiveTab(index)}
              style={{
                padding: '1rem 2rem',
                fontSize: '1rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: '9999px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontFamily: systemFontStack,
                background: activeTab === index 
                  ? 'linear-gradient(135deg, #DE1785, #F472B6)' 
                  : 'rgba(255, 255, 255, 0.8)',
                color: activeTab === index ? '#fff' : '#374151',
                boxShadow: activeTab === index 
                  ? '0 10px 25px rgba(222, 23, 133, 0.25), 0 4px 12px rgba(0, 0, 0, 0.05)'
                  : '0 4px 12px rgba(0, 0, 0, 0.08)',
                // border: activeTab === index ? 'none' : '1px solid rgba(229, 231, 235, 0.6)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
              }}
              onMouseEnter={e => {
                if (activeTab !== index) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.12)';
                }
              }}
              onMouseLeave={e => {
                if (activeTab !== index) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                }
              }}
            >
              {feature.title}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '2rem',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.08), 0 10px 25px rgba(0, 0, 0, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Top accent line */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '25%',
              right: '25%',
              height: '2px',
              background: 'linear-gradient(90deg, transparent, rgba(222, 23, 133, 0.4), transparent)',
            }}
          />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '4rem',
              alignItems: 'center',
              padding: '4rem',
              minHeight: '500px',
            }}
          >
            {/* Text Content */}
            <div style={{ order: activeTab === 1 ? 2 : 1 }}>
              <h3
                style={{
                  fontSize: '2.5rem',
                  fontWeight: 700,
                  color: '#1F2937',
                  margin: '0 0 1rem 0',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                }}
              >
                {features[activeTab].title}
              </h3>
              <p
                style={{
                  fontSize: '1.25rem',
                  color: '#DE1785',
                  fontWeight: 600,
                  margin: '0 0 2rem 0',
                }}
              >
                {features[activeTab].subtitle}
              </p>
              <p
                style={{
                  fontSize: '1.125rem',
                  color: '#4B5563',
                  lineHeight: 1.7,
                  margin: '0 0 2.5rem 0',
                }}
              >
                {features[activeTab].description}
              </p>
              
              {/* Benefits List */}
              <div style={{ marginBottom: '2rem' }}>
                {features[activeTab].benefits.map((benefit, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      marginBottom: '1rem',
                      gap: '0.75rem',
                    }}
                  >
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #DE1785, #F472B6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '2px',
                      }}
                    >
                      <div
                        style={{
                          width: '6px',
                          height: '6px',
                          background: '#fff',
                          borderRadius: '50%',
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: '1rem',
                        color: '#374151',
                        lineHeight: 1.6,
                      }}
                    >
                      {benefit}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <button
                style={{
                  padding: '1rem 2rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: '#fff',
                  background: 'linear-gradient(135deg, #DE1785, #F472B6)',
                  border: 'none',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 10px 25px rgba(222, 23, 133, 0.25), 0 4px 12px rgba(0, 0, 0, 0.05)',
                  fontFamily: systemFontStack,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 15px 35px rgba(222, 23, 133, 0.35), 0 8px 20px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(222, 23, 133, 0.25), 0 4px 12px rgba(0, 0, 0, 0.05)';
                }}
              >
                Learn More
              </button>
            </div>

            {/* Image */}
            <div style={{ order: activeTab === 1 ? 1 : 2 }}>
              <div
                style={{
                  position: 'relative',
                  borderRadius: '1.5rem',
                  overflow: 'hidden',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)',
                }}
              >
                <img
                  src={features[activeTab].image}
                  alt={features[activeTab].title}
                  style={{
                    width: '100%',
                    height: '400px',
                    objectFit: 'cover',
                    transition: 'transform 0.3s ease',
                  }}
                />
                {/* Image overlay */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(135deg, rgba(222, 23, 133, 0.1), rgba(244, 114, 182, 0.05))',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};