'use strict';
// ******** REQUIRES ****************************
const axios = require('axios');

// *** Database connection and test
const skiResortDb = require('../models/skiResortDb');
const hourlyWeatherDb = require('../models/hourlyWeatherDb');


// ******** GLOBAL VARIABLES ********************
let hourlyWeatherArray = [];
let resortArray = [];

// ******** FUNCTIONS ***************************

async function weatherSchedule() {
  // 7200000 = 2 hrs
  // 300000 = 5 min
  setInterval(updateWeatherArray, 1800000);
}

async function updateWeatherArray() {
  let currentDate = new Date(Date.now());
  console.log('*******************************************************************************************');
  console.log('******* getting weather: ', currentDate[Symbol.toPrimitive]('string'));
  console.log('*******************************************************************************************');
  resortArray = await skiResortDb.find({});
  resortArray.forEach((resort) => getWeather(resort));
  return hourlyWeatherArray;
}

async function getWeather(resort) {
  let lat = resort.lat;
  let lon = resort.lon;
  let url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${lat},${lon}?key=${process.env.VISUAL_CROSSING_API_KEY}&options=nonulls`
  let weatherData;
  let hourlyForecast = {};
  hourlyWeatherArray = [];
  let currentDate;

  try {
    // Get and parse weather data
    weatherData = await axios.get(url);
    weatherData = weatherData.data;

    // console.log(weatherData.days[0].hours[0]);
    // console.log(weatherData.days[0].hours[1]);

    // FOR EACH LOOP
    weatherData.days.forEach(async (day, dayIndex, baseArray) => {
      day.hours.forEach(async (hour, hourIndex) => {

        currentDate = new Date(hour.datetimeEpoch * 1000);

        // Create hourly data
        hourlyForecast = {
          key: `${resort.name}${hour.datetimeEpoch * 1000}`,
          resort: resort.name,
          dateTimeEpoch: hour.datetimeEpoch * 1000,
          dayOfWeek: currentDate.getDay() + 1,
          date: currentDate.getDate(),
          month: currentDate.getMonth() + 1,
          year: currentDate.getFullYear(),
          dateTime: hour.datetime,
          hour: currentDate.getHours(),
          min: currentDate.getMinutes(),
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
        hourlyWeatherArray.push(hourlyForecast);

      }) // end of hour forEach

    }) // end of day forEach
  } catch (error) {
    console.log(error.message);
  }

  let newData;

  hourlyWeatherArray.forEach(async (forecast, index) => {
    // TODO: see if key exists in database
    newData = await hourlyWeatherDb.findOne({ key: forecast.key });

    // TODO: if key exists, update.  If not, create.
    if (newData === null) {
      await hourlyWeatherDb.create(forecast);
      console.log('create');
    } else {
      await hourlyWeatherDb.findOneAndUpdate({ key: forecast.key }, forecast, { new: true, overwrite: true })
      // console.log('update');
    }
  })
}

async function getDatabaseWeather(request, response, next) {
  try {
    let resortName = request.params.resortName;
    let date = Date.now();
    let startDate = (date - 86400000); // one day ago

    console.log(startDate);
    console.log(resortName);

    // let dbResult = await hourlyWeatherDb.find({ resort: resortName });
    let dbResult = await hourlyWeatherDb.find({ resort: resortName, dateTimeEpoch: { $gte: startDate }, date: 7 });
    console.log(`current date ${date}`);
    console.log(`start date ${startDate}`);
    response.status(200).send(dbResult)

  } catch (error) {
    console.log(error.message);
    next(error);
  }
}

weatherSchedule();
// updateWeatherArray()


module.exports = { updateWeatherArray, getDatabaseWeather };
