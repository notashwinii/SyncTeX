import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";

const LatexEditor = ({ value, onChange }) => {
  const [lineNumbers, setLineNumbers] = useState([]);

  useEffect(() => {
    // Generate line numbers based on the number of lines in the textarea
    const lines = value.split("\n");
    const lineNumbersArray = Array.from(Array(lines.length).keys()).map(
      (index) => index + 1
    );
    setLineNumbers(lineNumbersArray);
  }, [value]);

  return (
    <div style={{ display: "flex", position: "relative", width: "100%" }}>
      <div
        style={{
          width: "40px", // Adjust width as needed
          padding: "10px 5px", // Adjust padding as needed
          backgroundColor: "#f0f0f0", // Background color for line numbers
          borderRight: "1px solid #ccc", // Separator between line numbers and editor
          overflowY: "auto", // Allow scrolling of line numbers
        }}
      >
        {lineNumbers.map((num) => (
          <div
            key={num}
            style={{
              padding: "0 5px",
              fontSize: "12px", // Adjust font size as needed
              color: "#666", // Line number text color
            }}
          >
            {num}
          </div>
        ))}
      </div>
      <textarea
        style={{
          flex: 1,
          minHeight: "100%",
          resize: "none",
          border: "none",
          padding: "10px",
          fontFamily: "'Courier New', Courier, monospace", // Use monospace font for consistent spacing
          fontSize: "14px", // Adjust font size as needed
          lineHeight: "1.4", // Adjust line height as needed
          outline: "none",
        }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck="false"
      />
    </div>
  );
};

LatexEditor.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default LatexEditor;
