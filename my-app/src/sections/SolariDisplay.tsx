// SolariDisplay.tsx
import React, { useEffect, useState } from "react";
import SplitFlap from "../components/SplitFlap";

import "./SolariDisplay.css"; 

type SolariDisplayProps = {
  phrases: string[]; // Array of phrases
  speed?: number;    // Speed of random character changes in milliseconds
  phraseDelay?: number; // Delay between phrases in milliseconds
};

const SolariDisplay: React.FC<SolariDisplayProps> = ({
  phrases,
  speed = 80,
  phraseDelay = 3000,
}) => {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [maxWordCount, setMaxWordCount] = useState(0);
  const [currentPhrase, setCurrentPhrase] = useState("");

  useEffect(() => {
    const max = Math.max(...phrases.map((phrase) => phrase.split(" ").length));
    setMaxWordCount(max);
    setCurrentPhrase(phrases[0]);
  }, [phrases]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPhraseIndex((prevIndex) =>
        prevIndex === phrases.length - 1 ? 0 : prevIndex + 1
      );
    }, phraseDelay);

    return () => clearInterval(interval);
  }, [phrases.length, phraseDelay]);

  useEffect(() => {
    setCurrentPhrase(phrases[currentPhraseIndex]);
  }, [currentPhraseIndex, phrases]);

  return (
    <div className="relative flex flex-col items-center justify-center h-screen bg-gradient-to-b from-orange-600 to-pink-500 text-white overflow-hidden">
      {currentPhrase.split(" ").map((word, index) => (
        <div key={index} className="solari-word">
          {word.split("").map((char, idx) => (
            <SplitFlap targetChar={char} speed={speed} />
          ))}
        </div>
      ))}
    </div>
  );
};

export default SolariDisplay;