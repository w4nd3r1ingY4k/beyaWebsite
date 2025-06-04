import React, { useState } from "react";

export const NewsletterForm: React.FC = () => {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      console.log("Newsletter signup:", email);
      setEmail("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6">
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email address"
          className="flex-1 px-4 py-2 rounded border border-gray-300 focus:outline-none focus:border-brandPink"
          required
        />
        <button
          type="submit"
          className="px-6 py-2 bg-brandPink text-white rounded hover:bg-pink-600 transition-colors"
        >
          Subscribe
        </button>
      </div>
    </form>
  );
};