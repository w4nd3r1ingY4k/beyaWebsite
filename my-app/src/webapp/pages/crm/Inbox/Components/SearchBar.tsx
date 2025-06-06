import React from 'react';

const SearchBar: React.FC = () => {
  return (
    <header className="topbar">
      <input className="search-input" type="text" placeholder="Search messages..." />
    </header>
  );
};

export default SearchBar;