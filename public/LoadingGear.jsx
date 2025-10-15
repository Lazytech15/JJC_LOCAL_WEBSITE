import React from 'react';

const GearLoadingSpinner = ({ isDarkMode = false }) => {
  return (
    <div className={`min-h-screen flex items-center justify-center transition-all duration-300 ${
      isDarkMode 
        ? "bg-gradient-to-br from-gray-900 via-slate-900 to-zinc-900" 
        : "bg-gradient-to-br from-slate-50 via-gray-50 to-stone-50"
    }`}>
      <div className="relative flex items-center justify-center">
        {/* Left Small Gear */}
        <div className="absolute -left-6 bottom-2">
          <svg
            className="w-12 h-12 animate-spin"
            style={{ animationDuration: '2s' }}
            viewBox="0 0 120 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g transform="translate(60, 60)">
              {/* Generate 8 teeth */}
              {[...Array(8)].map((_, i) => {
                const angle = (i * 360) / 8;
                return (
                  <rect
                    key={i}
                    x="-6"
                    y="-40"
                    width="12"
                    height="15"
                    fill={isDarkMode ? "#64748B" : "#546E7A"}
                    transform={`rotate(${angle})`}
                  />
                );
              })}
              {/* Outer ring */}
              <circle cx="0" cy="0" r="32" fill={isDarkMode ? "#64748B" : "#546E7A"} />
              {/* Inner ring (hole) */}
              <circle cx="0" cy="0" r="20" fill="none" stroke={isDarkMode ? "#38BDF8" : "#7DD3C0"} strokeWidth="3" />
              <circle cx="0" cy="0" r="20" fill={isDarkMode ? "#1E293B" : "#F3F4F6"} />
            </g>
          </svg>
        </div>

        {/* Center Large Gear */}
        <div className="z-10">
          <svg
            className="w-28 h-28 animate-spin"
            style={{ animationDuration: '3s', animationDirection: 'reverse' }}
            viewBox="0 0 140 140"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g transform="translate(70, 70)">
              {/* Generate 12 teeth */}
              {[...Array(12)].map((_, i) => {
                const angle = (i * 360) / 12;
                return (
                  <rect
                    key={i}
                    x="-8"
                    y="-55"
                    width="16"
                    height="20"
                    fill="#546E7A"
                    transform={`rotate(${angle})`}
                  />
                );
              })}
              {/* Outer ring */}
              <circle cx="0" cy="0" r="45" fill={isDarkMode ? "#64748B" : "#546E7A"} />
              {/* Inner ring (hole) */}
              <circle cx="0" cy="0" r="28" fill="none" stroke={isDarkMode ? "#38BDF8" : "#7DD3C0"} strokeWidth="4" />
              <circle cx="0" cy="0" r="28" fill={isDarkMode ? "#1E293B" : "#F3F4F6"} />
            </g>
          </svg>
        </div>

        {/* Right Small Gear */}
        <div className="absolute -right-6 bottom-2">
          <svg
            className="w-12 h-12 animate-spin"
            style={{ animationDuration: '2s' }}
            viewBox="0 0 120 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g transform="translate(60, 60)">
              {/* Generate 8 teeth */}
              {[...Array(8)].map((_, i) => {
                const angle = (i * 360) / 8;
                return (
                  <rect
                    key={i}
                    x="-6"
                    y="-40"
                    width="12"
                    height="15"
                    fill={isDarkMode ? "#64748B" : "#546E7A"}
                    transform={`rotate(${angle})`}
                  />
                );
              })}
              {/* Outer ring */}
              <circle cx="0" cy="0" r="32" fill={isDarkMode ? "#64748B" : "#546E7A"} />
              {/* Inner ring (hole) */}
              <circle cx="0" cy="0" r="20" fill="none" stroke={isDarkMode ? "#38BDF8" : "#7DD3C0"} strokeWidth="3" />
              <circle cx="0" cy="0" r="20" fill={isDarkMode ? "#1E293B" : "#F3F4F6"} />
            </g>
          </svg>
        </div>

        {/* Optional Loading Text */}
        <div className="absolute -bottom-12 text-center w-full">
          <p className={`font-medium ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Loading...</p>
        </div>
      </div>
    </div>
  );
};

export default GearLoadingSpinner;