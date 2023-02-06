'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

const collectionName = 'userDatabaseCollection';

// Create Schema
const userDatabaseSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
  },
  { collection: collectionName }
);

// Create Collection
const userDatabaseCollection = mongoose.model(collectionName, userDatabaseSchema);

module.exports = userDatabaseCollection;
