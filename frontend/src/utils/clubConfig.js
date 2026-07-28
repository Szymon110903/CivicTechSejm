export const CLUB_COLORS = {
  "KO": "#f08c00",       // Orange
  "PiS": "#002b66",      // Navy Blue
  "Lewica": "#e50000",   // Red
  "PSL-TD": "#1b7a2d",   // Green
  "PL2050-TD": "#e4d00a",// Yellow
  "Konfederacja": "#111827", // Very Dark Blue / Blackish
  "Razem": "#8B0000",    // Dark Red
  "Kukiz15": "#444444",  // Dark Gray
  "Niez.": "#888888",    // Gray
  "Niezrzeszeni": "#888888" // Gray
};

export const CLUB_ORDER = [
  "Lewica",
  "Razem",
  "KO",
  "PL2050-TD",
  "PSL-TD",
  "PiS",
  "Kukiz15",
  "Konfederacja",
  "Niez.",
  "Niezrzeszeni"
];

// Helper to safely get color
export const getClubColor = (clubName) => {
  return CLUB_COLORS[clubName] || "#aaaaaa";
};
