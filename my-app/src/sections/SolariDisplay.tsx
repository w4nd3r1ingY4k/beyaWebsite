// src/components/SolariDisplay.tsx
import React, { useEffect, useState } from "react";
import SplitFlap from "../components/SplitFlap";

type SolariDisplayProps = {
  phrases: string[];
  speed?: number;
  phraseDelay?: number;
};

export const SolariDisplay: React.FC<SolariDisplayProps> = ({
  phrases,
  speed = 80,
  phraseDelay = 3000,
}) => {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [currentPhrase, setCurrentPhrase] = useState(phrases[0] ?? "");

  useEffect(() => {
    setCurrentPhrase(phrases[currentPhraseIndex]);
  }, [currentPhraseIndex, phrases]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
    }, phraseDelay);
    return () => clearInterval(interval);
  }, [phrases.length, phraseDelay]);

  return (
    <div className="relative flex flex-col items-center justify-center h-screen overflow-hidden bg-gradient-to-b from-orange-500 to-pink-500 text-white">
      <div className="space-y-2">
        {currentPhrase.split(" ").map((word, wi) => (
          <div key={wi} className="flex space-x-1 justify-center">
            {word.split("").map((char, ci) => (
              <SplitFlap
                key={ci}
                targetChar={char}
                speed={speed}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
