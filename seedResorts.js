const mongoose = require('mongoose');
require('dotenv').config();

// *** Database Collection connection
const db = require("./models/skiResortDb");

async function seed() {
  // Database connection
  const databaseName = 'snow-forecast';
  mongoose.connect(`${process.env.DB_URL}${databaseName}?retryWrites=true&w=majority`);

  await db.create({
    name: 'Crystal Mountain Resort',
    lat: 46.93542814527114,
    lon: -121.47471038682461
  });

  await db.create({
    name: 'Summit at Snoqualmie',
    lat: 47.42471625304692, 
    lon: -121.41642693098201
  });

  mongoose.disconnect();
}

seed();