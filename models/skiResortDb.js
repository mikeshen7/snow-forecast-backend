'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

const collectionName = 'skiResortDb';

// Create Schema
const skiResortDbSchema = new Schema(
  {
    name: { type: String, required: true },
    lat: { type: Number, required: true },
    lon: { type: Number, required: true },
  },
  { collection: collectionName }
);

// Create Collection
const skiResortDb = mongoose.model(collectionName, skiResortDbSchema);

module.exports = skiResortDb;
