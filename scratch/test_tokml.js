const tokml = require('tokml');

const featureCollection = {
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]]
            },
            properties: {
                name: 'Zone A',
                description: 'This is my zone description',
                stroke: '#ff0000',
                'stroke-width': 2,
                'stroke-opacity': 1.0,
                fill: '#ff0000',
                'fill-opacity': 0.5
            }
        }
    ]
};

console.log("\n--- With simplestyle: true, name: 'name', description: 'description' ---");
console.log(tokml(featureCollection, {
    simplestyle: true,
    name: 'name',
    description: 'description'
}));
