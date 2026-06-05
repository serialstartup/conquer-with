// scripts/generate-province-paths.js
const fs = require('fs');
const path = require('path');

const BOUNDS = { minLon: 25.7, maxLon: 44.8, minLat: 35.8, maxLat: 42.1 };
const VIEW_W = 800;
const VIEW_H = 480;
const SIMPLIFY_STEP = 3;

function normalize(str) {
  return str.toLowerCase()
    .replace(/ı/g, 'i').replace(/i̇/g, 'i')
    .replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o')
    .replace(/ç/g, 'c').replace(/â/g, 'a')
    .trim();
}

function toXY(lon, lat) {
  const x = ((lon - BOUNDS.minLon) / (BOUNDS.maxLon - BOUNDS.minLon)) * VIEW_W;
  const y = ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * VIEW_H;
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

function ringToPath(ring) {
  const sampled = ring.filter((_, i) => i % SIMPLIFY_STEP === 0);
  if (sampled[sampled.length - 1] !== ring[ring.length - 1]) {
    sampled.push(ring[ring.length - 1]);
  }
  const pts = sampled.map(([lon, lat]) => toXY(lon, lat));
  return 'M ' + pts.map(([x, y]) => `${x},${y}`).join(' L ') + ' Z';
}

function geometryToPath(geom) {
  if (geom.type === 'Polygon') {
    return geom.coordinates.map(ringToPath).join(' ');
  }
  if (geom.type === 'MultiPolygon') {
    return geom.coordinates.flatMap(poly => poly.map(ringToPath)).join(' ');
  }
  return '';
}

function centroid(geom) {
  let sumX = 0, sumY = 0, n = 0;
  const addRing = (ring) => {
    for (const [lon, lat] of ring) {
      const [x, y] = toXY(lon, lat);
      sumX += x; sumY += y; n++;
    }
  };
  if (geom.type === 'Polygon') addRing(geom.coordinates[0]);
  else if (geom.type === 'MultiPolygon') {
    let biggest = null, maxLen = 0;
    for (const poly of geom.coordinates) {
      if (poly[0].length > maxLen) { maxLen = poly[0].length; biggest = poly; }
    }
    if (biggest) addRing(biggest[0]);
  }
  return [Math.round(sumX / n * 10) / 10, Math.round(sumY / n * 10) / 10];
}

const geojson = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'data', 'tr-cities-utf8.json'), 'utf8'
));
const provinces = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', 'src', 'data', 'provinces.json'), 'utf8'
));

const ALIASES = {
  'afyon': 'afyonkarahisar',
};

const nameToId = Object.fromEntries(provinces.map(p => [normalize(p.name), p.id]));

const output = {};
const unmatched = [];

for (const f of geojson.features) {
  const raw = f.properties.name || f.properties.NAME || '';
  let norm = normalize(raw);
  if (ALIASES[norm]) norm = ALIASES[norm];
  const id = nameToId[norm];
  if (id === undefined) { unmatched.push(raw); continue; }
  output[id] = { path: geometryToPath(f.geometry), centroid: centroid(f.geometry) };
}

if (unmatched.length > 0) {
  console.error('❌ Unmatched provinces:', unmatched);
  process.exit(1);
}

const outPath = path.join(__dirname, '..', 'src', 'data', 'provinces-paths.json');
fs.writeFileSync(outPath, JSON.stringify(output));
console.log(`✓ ${Object.keys(output).length}/81 provinces processed → ${outPath}`);
const kb = Math.round(fs.statSync(outPath).size / 1024);
console.log(`✓ File size: ${kb} KB`);
