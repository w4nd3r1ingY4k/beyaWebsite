// SolariDisplay.tsx
import React, { useEffect, useState } from "react";
import SplitFlap from "../components/SplitFlap";
import styles from '../styles/SolariDisplay.module.css';

type SolariDisplayProps = {
  phrases: string[];
  speed?: number;
  phraseDelay?: number;
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
    <div className={styles.container}>
      {currentPhrase.split(" ").map((word, index) => (
        <div key={index} className={styles.solariWord}>
          {word.split("").map((char, idx) => (
            <SplitFlap key={idx} targetChar={char} speed={speed} />
          ))}
        </div>
      ))}
    </div>
  );
};

export default SolariDisplay;