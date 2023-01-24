'use strict';
// *** REQUIRES
require('dotenv').config();                      // *** allows use of .env file
const express = require('express');              // *** Backend server
const cors = require('cors');                    // *** Middleware 
const mongoose = require('mongoose');            // *** Database modeling

// *** Database connection and test
mongoose.connect(process.env.DB_URL);
const database = mongoose.connection;
database.on('error', console.error.bind(console, 'connection error:'));
database.once('open', function () {
  console.log('Mongoose is connected');
});
mongoose.set('strictQuery', false);

// *** Server and middleware connection
const app = express();
app.use(cors());
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`server listening on ${PORT}`));

// *** ENDPOINTS
app.get('/', (request, response) => response.status(200).send('Welcome'));


app.get('*', (request, response) => response.status(404).send('Not available'));
app.use((error, request, response, next) => response.status(500).send(error.message));
