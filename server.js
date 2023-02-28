'use strict';
// *** REQUIRES
require('dotenv').config();                      // *** allows use of .env file
const express = require('express');              // *** Backend server
const cors = require('cors');                    // *** Middleware 
const mongoose = require('mongoose');            // *** Database
const resorts = require('./modules/resorts');
const weather = require('./modules/weather');
const dailyWeather = require('./modules/dailyWeather');
// const getLocation = require('./modules/location');


// *** Database connection and test
const databaseName = 'snow-forecast';
mongoose.connect(`${process.env.DB_URL}${databaseName}?retryWrites=true&w=majority`);
const database = mongoose.connection;
database.on('error', console.error.bind(console, 'connection error:'));
database.once('open', function () {
  console.log('Mongoose is connected');
});
mongoose.set('strictQuery', false);

// *** Database Collection connection
const skiResortDb = require('./models/skiResortDb');
const hourlyWeatherDb = require('./models/hourlyWeatherDb');

// *** Server and middleware connection
const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`server listening on ${PORT}`));

// *** Ski Resort Endpoints
app.post('/resorts', (request, response, next) => resorts.create(request, response, next));
app.get('/resorts', (request, response, next) => resorts.readAll(request, response, next));
app.get('/resorts/:resortName', (request, response, next) => resorts.readOne(request, response, next));
app.put('/resorts/:resortName', (request, response, next) => resorts.update(request, response, next));
app.delete('/resorts/:resortName', (request, response, next) => resorts.remove(request, response, next));

app.get('/weather/:resortName', (request, response, next) => weather.getDatabaseWeather(request, response, next));
app.get('/dailyWeather/:resortName', (request, response, next) => dailyWeather.getDailyWeather(request, response, next));

// *** ENDPOINTS
app.get('/', (request, response) => response.status(200).send('Welcome'));
app.get('/health', (request, response) => response.status(200).send('Health OK'));

app.get('/location', (request, response, next) => getLocation(request, response, next));

app.get('*', (request, response) => response.status(404).send('Not available'));
app.use((error, request, response, next) => response.status(500).send(error.message));



// *** FUNCTIONS

