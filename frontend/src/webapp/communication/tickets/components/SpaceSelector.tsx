import React from 'react';
import { ChevronDown } from 'lucide-react';
import { Space } from '@/types/taskManagement';
import styles from '@/styles/SpaceSelector.module.css';

interface SpaceSelectorProps {
  spaces: Space[];
  selectedSpace: Space | null;
  onSelectSpace: (space: Space) => void;
}

const SpaceSelector: React.FC<SpaceSelectorProps> = ({
  spaces,
  selectedSpace,
  onSelectSpace,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSpaceSelect = (space: Space) => {
    onSelectSpace(space);
    setIsOpen(false);
  };

  return (
    <div className={styles.container}>
      <button
        className={styles.selector}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {selectedSpace && (
          <div className={styles.selectedSpace}>
            <div
              className={styles.spaceColor}
              style={{ backgroundColor: selectedSpace.color }}
            />
            <span className={styles.spaceName}>{selectedSpace.name}</span>
          </div>
        )}
        <ChevronDown
          size={16}
          className={`${styles.chevron} ${isOpen ? styles.rotated : ''}`}
        />
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          {spaces.map((space) => (
            <button
              key={space.id}
              className={`${styles.spaceOption} ${
                selectedSpace?.id === space.id ? styles.selected : ''
              }`}
              onClick={() => handleSpaceSelect(space)}
            >
              <div
                className={styles.spaceColor}
                style={{ backgroundColor: space.color }}
              />
              <div className={styles.spaceInfo}>
                <span className={styles.spaceName}>{space.name}</span>
                {space.description && (
                  <span className={styles.spaceDescription}>
                    {space.description}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SpaceSelector; 