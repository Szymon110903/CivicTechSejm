/**
 * Generates coordinate points (x, y) for a parliamentary hemicycle (semi-circle).
 * 
 * @param {number} totalSeats - Total number of seats (e.g. 460)
 * @param {number} rowsCount - Number of concentric semi-circles
 * @param {number} width - SVG width
 * @param {number} height - SVG height
 * @returns {Array} Array of seat objects with {x, y, angle, row}
 */
export function generateHemicycle(totalSeats, rowsCount = 10, width = 800, height = 450) {
  // Center of the hemicycle (bottom middle of the SVG)
  const cx = width / 2;
  const cy = height - 20; // 20px padding from the bottom edge

  // The maximum radius for the outermost row
  const maxRadius = Math.min(width / 2, height) - 40; 
  // The minimum radius for the innermost row
  const minRadius = maxRadius * 0.35; 

  const seats = [];
  
  // 1. Calculate the radius for each row and the total length of all semi-circles
  const rowRadii = [];
  let totalLength = 0;
  for (let i = 0; i < rowsCount; i++) {
    const r = minRadius + (maxRadius - minRadius) * (i / (rowsCount - 1));
    rowRadii.push(r);
    totalLength += Math.PI * r;
  }

  // 2. Allocate the total seats to each row proportionally to the row's circumference length
  const seatsPerRow = [];
  let remainingSeats = totalSeats;
  
  for (let i = 0; i < rowsCount; i++) {
    if (i === rowsCount - 1) {
      // Last row takes whatever is left
      seatsPerRow.push(remainingSeats);
    } else {
      const rowLength = Math.PI * rowRadii[i];
      let rowSeats = Math.round((rowLength / totalLength) * totalSeats);
      if (rowSeats < 2) rowSeats = 2; // minimum seats per row fallback
      seatsPerRow.push(rowSeats);
      remainingSeats -= rowSeats;
    }
  }

  // 3. Generate (x, y) coordinates for each seat
  for (let rIndex = 0; rIndex < rowsCount; rIndex++) {
    const r = rowRadii[rIndex];
    const numSeats = seatsPerRow[rIndex];
    
    for (let sIndex = 0; sIndex < numSeats; sIndex++) {
      // Angle goes from PI (left side) to 0 (right side)
      const angle = numSeats === 1 
        ? Math.PI / 2 
        : Math.PI - (sIndex * (Math.PI / (numSeats - 1)));
        
      const x = cx + r * Math.cos(angle);
      const y = cy - r * Math.sin(angle);
      
      seats.push({
        x,
        y,
        angle,
        row: rIndex,
      });
    }
  }

  // 4. Sort seats primarily by angle (from left to right) 
  // Angle PI is left, 0 is right. We want descending angle so it goes Left -> Right.
  seats.sort((a, b) => {
    // Sort by angle first
    if (Math.abs(b.angle - a.angle) > 0.001) {
       return b.angle - a.angle; 
    }
    // If angles are extremely close, sort by row (inner to outer)
    return a.row - b.row;
  });

  return seats;
}
