import React from "react";
import "./Spinner.css"; // Import the CSS file

const Spinner: React.FC = () => {
  return (
    <div className="spinner-container">
      <div className="spinner">
        <div></div>
      </div>
    </div>
  );
};

export default Spinner;
