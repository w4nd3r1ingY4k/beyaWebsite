import React from "react";
import { useEffect } from "react";
import { NavigationBar } from "../components/navigation/NavigationBar";
import { Footer } from "../components/Footer";
import { footerData } from "../ContentData";


const Privacy: React.FC = () => {
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, []);
  return (
    <div className="min-h-screen bg-white text-gray-800 flex flex-col">
      <NavigationBar />

      {/* Page Header */}
      <header className="bg-[#F9FAFB] w-full py-40 px-4 text-center border-b border-gray-200">
        <h1 className="text-5xl font-bold text-[#3A3A3A]">Privacy Policy</h1>
        <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
          How we collect, use, and protect your information when using Beya.
        </p>
      </header>

      {/* Main Content */}
      <main className="flex-grow px-6 py-12 max-w-4xl mx-auto">
        <p className="mb-6">
          Beya, Inc. (“we,” “our,” or “us”) respects your privacy and is committed
          to protecting your personal information. This Privacy Policy explains how
          we collect, use, and safeguard your information when you use our mobile
          application, Beya.
        </p>

        <h2 className="text-2xl font-semibold mb-2">Information We Collect</h2>
        <ul className="list-disc list-inside mb-6">
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

        <h2 className="text-2xl font-semibold mb-2">How We Use Your Information</h2>
        <ul className="list-disc list-inside mb-6">
          <li>Improve and enhance the functionality and user experience of our app.</li>
          <li>Provide valuable business insights to you and other users of the platform.</li>
          <li>Process transactions securely.</li>
        </ul>

        <h2 className="text-2xl font-semibold mb-2">Third-Party Services</h2>
        <p className="mb-2">We use third-party service providers, including:</p>
        <ul className="list-disc list-inside mb-6">
          <li>Stripe (payment processing)</li>
          <li>Firebase (authentication, database, storage)</li>
          <li>Expo (app development framework)</li>
          <li>AWS S3 (cloud storage)</li>
          <li>OpenAI (AI integrations)</li>
          <li>Apple Notifications</li>
          <li>React Native (app development framework)</li>
        </ul>
        <p className="mb-6">
          These third-party providers have their own privacy policies governing their use of your data.
        </p>

        <h2 className="text-2xl font-semibold mb-2">Permissions</h2>
        <p className="mb-2">Our app requests access to your:</p>
        <ul className="list-disc list-inside mb-6">
          <li>Camera</li>
          <li>Microphone</li>
          <li>Bluetooth</li>
        </ul>
        <p className="mb-6">We do not request access to your contacts or background location data.</p>

        <h2 className="text-2xl font-semibold mb-2">Account Management</h2>
        <p className="mb-6">
          You may delete your account and personal information at any time directly within the app settings.
        </p>

        <h2 className="text-2xl font-semibold mb-2">Age Restriction</h2>
        <p className="mb-6">
          Beya is intended exclusively for individuals aged 18 and above. We do not knowingly collect or store information from users under the age of 18.
        </p>

        <h2 className="text-2xl font-semibold mb-2">Data Security</h2>
        <p className="mb-6">
          We implement industry-standard security measures to protect your personal data against unauthorized access, disclosure, alteration, or destruction.
        </p>

        <h2 className="text-2xl font-semibold mb-2">Contact Us</h2>
        <p className="mb-6">
          For questions or concerns regarding your privacy or this policy, please contact us at:
        </p>
        <address className="not-italic mb-6">
          <strong>Beya, Inc.</strong><br />
          5248 10th Street West
        </address>

        <p className="mt-12 italic text-sm">Thank you for trusting Beya with your business needs.</p>
      </main>

      <Footer {...footerData} />
    </div>
  );
};

export default Privacy;