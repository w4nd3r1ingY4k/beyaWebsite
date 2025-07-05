// SplitFlap.tsx
import React, { useEffect, useState } from "react";
import "./SplitFlap.css";

type SplitFlapProps = {
  targetChar: string;
  speed?: number;
};

const SplitFlap: React.FC<SplitFlapProps> = ({
  targetChar,
  speed = 100,
}) => {
  const [currentChar, setCurrentChar] = useState(" ");
  const [isRandomizing, setIsRandomizing] = useState(false);

  useEffect(() => {
    if (currentChar === targetChar) return;

    const randomChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ";

    setIsRandomizing(true); // Start randomizing

    const randomInterval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * randomChars.length);
      setCurrentChar(randomChars[randomIndex]);
    }, speed);

    const randomDuration = 1000; // 1 second
    const timeout = setTimeout(() => {
      clearInterval(randomInterval);
      setCurrentChar(targetChar);
      setIsRandomizing(false); // Settled
    }, randomDuration);

    return () => {
      clearInterval(randomInterval);
      clearTimeout(timeout);
    };
  }, [targetChar, speed]);

  return (
    <div className="split-flap">
      <div
        className={`split-flap-char ${
          isRandomizing ? "randomizing" : "settled"
        }`}
      >
        {currentChar}
      </div>
    </div>
  );
};

export default SplitFlap;