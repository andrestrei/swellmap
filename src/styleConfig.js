// Define a refined color palette for significant wave heights (swh) in meters
export const colorPalette = {
    0.0: '#001f3f', // Dark Blue
    0.5: '#003366', // Navy Blue
    1.0: '#004080', // Medium Blue
    1.5: '#0059b3', // Royal Blue
    2.0: '#0073e6', // Dodger Blue
    2.5: '#3399ff', // Sky Blue
    3.0: '#66b3ff', // Light Sky Blue
    3.5: '#99ccff', // Light Blue
    4.0: '#cce6ff', // Pale Blue
    4.5: '#00ffff', // Aqua
    5.0: '#00ffcc', // Pale Green
    5.5: '#00ff99', // Light Green
    6.0: '#99ff33', // Yellow Green
    6.5: '#ffff00', // Yellow
    7.0: '#ffcc00', // Gold
    7.5: '#ff9933', // Orange
    8.0: '#ff6600', // Dark Orange
    8.5: '#ff3300', // Orange Red
    9.0: '#ff0000', // Red
    9.5: '#e60000', // Crimson
    10.0: '#cc0000', // Dark Red
    10.5: '#b30000', // Maroon
    11.0: '#990000', // Dark Maroon
    11.5: '#800000', // Burgundy
    12.0: '#660000', // Dark Burgundy
    12.5: '#4d0000', // Darker Burgundy
    13.0: '#330000', // Very Dark Red
    13.5: '#1a0000', // Almost Black Red
    14.0: '#0d0000', // Blackish Red
    14.5: '#050000', // Near Black
    15.0: '#000000', // Black
};

export function getStyle(swh_height_min) {
    const numericHeight = parseFloat(swh_height_min);
    const color = numericHeight > 15 ? '#000000' : (colorPalette[numericHeight] || '#ffffff');
    return {
        fill: true,
        stroke: true,
        color: '#000000',
        weight: 1,
        fillColor: color,
        fillOpacity: 0.8,
    };
}
