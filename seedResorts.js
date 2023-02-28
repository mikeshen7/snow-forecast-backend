const mongoose = require('mongoose');
require('dotenv').config();

// *** Database Collection connection
const db = require("./models/skiResortDb");

async function seed() {
  // Database connection
  const databaseName = 'snow-forecast';
  mongoose.connect(`${process.env.DB_URL}${databaseName}?retryWrites=true&w=majority`);

  await db.create({
    name: 'Palisades',
    lat: 39.191,
    lon: -120.24853,
    utc: -8
  });

  await db.create({
    name: 'Mammoth',
    lat: 37.65132,
    lon: -119.0268,
    utc: -8
  });

  await db.create({
    name: 'Crystal Mountain Resort',
    lat: 46.93542814527114,
    lon: -121.47471038682461,
    utc: -8
  });

  await db.create({
    name: 'Bachelor',
    lat: 44.00314,
    lon: -121.67806,
    utc: -8
  });

  await db.create({
    name: 'Summit at Snoqualmie',
    lat: 47.42471625304692, 
    lon: -121.41642693098201,
    utc: -8
  });

  mongoose.disconnect();
}

seed();