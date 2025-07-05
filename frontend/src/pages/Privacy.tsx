import React from "react";
import { useEffect } from "react";
import { NavigationBar } from "../components/navigation/NavigationBar";
import { Footer } from "../components/Footer";
import { footerData } from "../ContentData";
import "./Privacy.css";

const Privacy: React.FC = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="privacy-container">
      <NavigationBar />

      {/* Page Header */}
      <header className="privacy-header">
        <h1 className="privacy-title">Privacy Policy</h1>
        <p className="privacy-subtitle">
          How we collect, use, and protect your information when using Beya.
        </p>
      </header>

      {/* Main Content */}
      <main className="privacy-main">
        <p className="privacy-intro">
          Beya, Inc. ("we," "our," or "us") respects your privacy and is committed
          to protecting your personal information. This Privacy Policy explains how
          we collect, use, and safeguard your information when you use our mobile
          application, Beya.
        </p>

        <section className="privacy-section">
          <h2 className="privacy-section-title">Information We Collect</h2>
          <ul className="privacy-list">
            <li>Name</li>
            <li>Email address</li>
            <li>Phone number</li>
            <li>Birthday</li>
            <li>Social Security Number (SSN, number only)</li>
            <li>Bank account information</li>
            <li>Username and password</li>
            <li>Location data</li>
            <li>Orders, sales, and inventory data</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2 className="privacy-section-title">How We Use Your Information</h2>
          <ul className="privacy-list">
            <li>Improve and enhance the functionality and user experience of our app.</li>
            <li>Provide valuable business insights to you and other users of the platform.</li>
            <li>Process transactions securely.</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2 className="privacy-section-title">Third-Party Services</h2>
          <p className="privacy-paragraph">We use third-party service providers, including:</p>
          <ul className="privacy-list">
            <li>Stripe (payment processing)</li>
            <li>Firebase (authentication, database, storage)</li>
            <li>Expo (app development framework)</li>
            <li>AWS S3 (cloud storage)</li>
            <li>OpenAI (AI integrations)</li>
            <li>Apple Notifications</li>
            <li>React Native (app development framework)</li>
          </ul>
          <p className="privacy-paragraph">
            These third-party providers have their own privacy policies governing their use of your data.
          </p>
        </section>

        <section className="privacy-section">
          <h2 className="privacy-section-title">Permissions</h2>
          <p className="privacy-paragraph">Our app requests access to your:</p>
          <ul className="privacy-list">
            <li>Camera</li>
            <li>Microphone</li>
            <li>Bluetooth</li>
          </ul>
          <p className="privacy-paragraph">
            We do not request access to your contacts or background location data.
          </p>
        </section>

        <section className="privacy-section">
          <h2 className="privacy-section-title">Account Management</h2>
          <p className="privacy-paragraph">
            You may delete your account and personal information at any time directly within the app settings.
          </p>
        </section>

        <section className="privacy-section">
          <h2 className="privacy-section-title">Age Restriction</h2>
          <p className="privacy-paragraph">
            Beya is intended exclusively for individuals aged 18 and above. We do not knowingly collect or store information from users under the age of 18.
          </p>
        </section>

        <section className="privacy-section">
          <h2 className="privacy-section-title">Data Security</h2>
          <p className="privacy-paragraph">
            We implement industry-standard security measures to protect your personal data against unauthorized access, disclosure, alteration, or destruction.
          </p>
        </section>

        <section className="privacy-section">
          <h2 className="privacy-section-title">Contact Us</h2>
          <p className="privacy-paragraph">
            For questions or concerns regarding your privacy or this policy, please contact us at:
          </p>
          <address className="privacy-address">
            <strong>Beya, Inc.</strong><br />
            5248 10th Street West
          </address>
        </section>

        <p className="privacy-footer">
          Thank you for trusting Beya with your business needs.
        </p>
      </main>

      <Footer {...footerData} />
    </div>
  );
};

export default Privacy;