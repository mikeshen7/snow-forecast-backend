'use strict';
// ******** REQUIRES ****************************
const axios = require('axios');
const cache = require('../modules/cache');

// *** Database connection and test
const skiResortDb = require('../models/skiResortDb');
const hourlyWeatherDb = require('../models/hourlyWeatherDb');


// ******** GLOBAL VARIABLES ********************
let hourlyWeather = []; // Array of hourly weather objects for all resorts.  Updated on schedule with data starting from yesterday.
let resorts = []; // Array of resort objects, from resort cache

// ******** FUNCTIONS ***************************
async function updateHourlyWeatherSchedule() {
  // Initialize list of resorts
  resorts = cache['resorts'];
  cache['hourlyWeather'] = await hourlyWeatherDb.find({})

  // Initialize hourly weather data array
  dbReadHourlyWeather();

  // Get API date for 1 resort every hour (3600000 seconds)
  let resortIndex = 0;
  setInterval(() => {
    apiReadHourlyWeather(resorts[resortIndex].name);
    dbReadHourlyWeather();

    resorts = cache['resorts'];
    resortIndex >= resorts.length - 1
      ? resortIndex = 0
      : resortIndex++
  }, 3600000)
}

async function apiReadHourlyWeather(resortName) {
  console.log(`******************************************** getting weather for ${resortName} on ${Date()} ********************`);

  let resort = resorts.filter((resort) => resort.name === resortName); // returns array
  resort = resort[0]; // returns object
  let lat = resort.lat
  let lon = resort.lon;

  let url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${lat},${lon}?key=${process.env.VISUAL_CROSSING_API_KEY}&options=nonulls`
  let weatherData;
  let hourlyForecast = {};
  let forecastData = [];
  let currentDate;

  try {
    // Get and parse weather data.  Returns 15 days of results
    weatherData = await axios.get(url);
    weatherData = weatherData.data;

    // Loop through each DAY in API result
    weatherData.days.forEach(async (day, dayIndex, baseArray) => {
      // Loop through each HOUR in API result
      day.hours.forEach(async (hour, hourIndex) => {
        currentDate = new Date(hour.datetimeEpoch * 1000);

        // Calculate resort year, month, date, day
        let resortDate = calcResortDate(resort, currentDate)

        // Create hourly data
        hourlyForecast = {
          key: `${resort.name}${hour.datetimeEpoch * 1000}`,
          resort: resort.name,
          dateTimeEpoch: hour.datetimeEpoch * 1000,

          dayOfWeek: resortDate.day,
          date: resortDate.date,
          month: resortDate.month,
          year: resortDate.year,

          dateTime: hour.datetime,
          precipProb: hour.precipprob,
          precipType: hour.preciptype,
          precip: hour.precip,
          snow: hour.snow,
          windspeed: hour.windspeed,
          cloudCover: hour.cloudcover,
          visibility: hour.visibility,
          conditions: hour.conditions,
          icon: hour.icon,
          temp: hour.temp,
          feelsLike: hour.feelslike,
        }

        // Save hourly data to array
        forecastData.push(hourlyForecast);

      }) // end of hour forEach

    }) // end of day forEach

    // Save hourly data to database
    await dbUpdateHourlyWeather(forecastData);

    // Read from database and save to global variable
    hourlyWeather = await hourlyWeatherDb.find({});

  } catch (error) {
    console.log(error.message, 'hourlyWeather.js apiReadHourlyWeather');
  }
}

async function dbUpdateHourlyWeather(forecastData) {
  console.log(`******************************************** saving weather data to database ${Date()} ********************`);
  let newData;

  try {
    forecastData.forEach(async (forecast) => {
      // Update.  If does not exist, create
      await hourlyWeatherDb.findOneAndUpdate({ key: forecast.key }, forecast, { upsert: true });
    })

    // save to cache
    cache['hourlyWeather'] = await hourlyWeatherDb.find({})

  } catch (error) {
    console.log(error.message, 'hourlyWeather.js dbUpdateHourlyWeather');
  }
}

async function dbReadHourlyWeather() {
  let dbResults = [];
  try {
    dbResults = await hourlyWeatherDb.find({});
    dbResults.sort((a, b) => a.key > b.key ? 1 : -1);
    hourlyWeather = dbResults;
    return hourlyWeather;
  } catch (error) {
    console.log(error.message, 'hourlyWeather.js dbReadHourlyWeather');
  }
}

async function endPointReadHourlyWeather(request, response, next) {

  try {
    let resortName = request.params.resortName;

    console.log(`******************************************** getting endpoint weather for ${resortName} on ${Date()} ********************`);

    // Set startDate to 6PM the previous day
    let startDate = calcResortStartTimeEpoch(resortName);


    // Filter for this resort only
    let dbResult = hourlyWeather.filter((forecast) => forecast.resort === resortName);
    dbResult = dbResult.filter((forecast) => forecast.dateTimeEpoch >= startDate);
    dbResult.sort((a, b) => (a.dateTimeEpoch > b.dateTimeEpoch) ? 1 : -1);

    response.status(200).send(dbResult)

  } catch (error) {
    console.log(error.message, 'hourlyWeather.js endPointReadHourlyWeather');
    next(error);
  }
}

function calcResortDate(resort, epochTime) {
  // Create Date object
  let currentDate = new Date(epochTime);
  currentDate.setMinutes(0);
  currentDate.setSeconds(0);
  currentDate.setMilliseconds(0);

  let currentDateEpoch = currentDate[Symbol.toPrimitive]('number');

  // Resort date in local time, adjusting for resort UTC time
  let resortDate = currentDate;
  resortDate.setHours(resortDate.getHours() + resort.utc);

  let resortData = {
    year: resortDate.getFullYear(),
    month: resortDate.getUTCMonth() + 1,
    date: resortDate.getUTCDate(),
    day: resortDate.getUTCDay()
  }

  return resortData;
}

function calcResortStartTimeEpoch(resortName) {
  let resort = resorts.filter((resort) => resort.name === resortName); // returns array
  resort = resort[0]; // returns object

  // Create Date object
  let currentDate = new Date(Date.now());
  currentDate.setMinutes(0);
  currentDate.setSeconds(0);
  currentDate.setMilliseconds(0);

  let currentDateEpoch = currentDate[Symbol.toPrimitive]('number');

  // Resort date in local time, adjusting for resort UTC time
  let resortDate = currentDate;
  resortDate.setHours(resortDate.getHours() + resort.utc);

  // Calc hours to midnight of previous day
  let hoursToDelete = resortDate.getUTCHours() + 24;

  let startTimeEpoch = currentDateEpoch - hoursToDelete * 3600000;

  return startTimeEpoch;
}


// Delay starting schedule to allow resort cache to update
setTimeout(updateHourlyWeatherSchedule, 10000);

module.exports = { apiReadHourlyWeather, endPointReadHourlyWeather, calcResortDate };
