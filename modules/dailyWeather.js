'use strict';

// ******** REQUIRES ****************************
const axios = require('axios');
const cache = require('../modules/cache');
const hourlyData = require('../modules/hourlyWeather');

// *** Database connection and test
const skiResortDb = require('../models/skiResortDb');
const dailyWeatherDb = require('../models/dailyWeatherDb');

// *** Global Variables
let hourlyWeather = []; // Array of hourly weather objects for all resorts.  From cache.
let dailyWeather = [];
let resorts = []; // Array of resort objects, from resort cache


async function updateDailyWeatherSchedule() {
  // Initialize data
  resorts = cache['resorts'];
  hourlyWeather = cache['hourlyWeather'];
  resorts.forEach((resort) => dbUpdateDailyWeather(resort));

  // Update daily weather every hour (3600000 seconds)
  setInterval(() => {
    hourlyWeather = cache['hourlyWeather'];

    resorts.forEach((resort) => dbUpdateDailyWeather(resort));
  }, 3600000);
}

async function dbUpdateDailyWeather(resort) {
  // Variables
  let resortName = resort.name;
  let tempDataObject = {};
  let tempDailyWeather = [];
  let startEpoch = calcResortStartTimeEpoch(resortName);
  let endEpoch = calcResortStartTimeEpoch(resortName);

  console.log(`******************************************** Calculating daily weather for ${resortName} on ${Date()} ********************`);
  
  // divde day into 3 sections:
  // 6AM - 12PM (AM, 6 hrs)
  // 12PM - 6PM (PM, 6 hrs)
  // 6 PM - 6AM (Night, 12 hrs)
    
  if (hourlyWeather.length != 0) {
    for (let day = 0; day < 14; day++) {
      // *** Calc for 6PM to 6AM
      startEpoch = endEpoch;
      endEpoch = startEpoch + 43200000;

      tempDataObject = calcDailyWeather(resort, startEpoch, endEpoch);
      tempDataObject.time = 'Night';
      tempDailyWeather.push(tempDataObject);

      // *** Calc for 6AM to 12PM
      startEpoch = endEpoch;
      endEpoch = startEpoch + 21600000;
      tempDataObject = calcDailyWeather(resort, startEpoch, endEpoch);
      tempDataObject.time = 'AM';
      tempDailyWeather.push(tempDataObject);

      // *** Calc for 12PM to 6PM
      startEpoch = endEpoch;
      endEpoch = startEpoch + 21600000;
      tempDataObject = calcDailyWeather(resort, startEpoch, endEpoch);
      tempDataObject.time = 'PM';
      tempDailyWeather.push(tempDataObject);
    }
    
    try {
      // Update or create database
      tempDailyWeather.forEach(async (forecast) => {
        await dailyWeatherDb.findOneAndUpdate({ key: forecast.key }, forecast, { upsert: true });
      })

      // Save to global variable
      dailyWeather = await dailyWeatherDb.find({});

    } catch (error) {
      console.log(error.message, 'dailyWeather.js updateDailyWeather');
    }
  }
}

function calcDailyWeather(resort, startEpoch, endEpoch) {
  // Filter data for specific time period
  let dbResult = hourlyWeather.filter((forecast) => forecast.resort === resort.name);
  dbResult = dbResult.filter((forecast) => forecast.dateTimeEpoch >= startEpoch);
  dbResult = dbResult.filter((forecast) => forecast.dateTimeEpoch < endEpoch);
  dbResult.sort((a, b) => (a.dateTimeEpoch > b.dateTimeEpoch) ? 1 : -1);

  // calc average / total data
  let count = 0;
  let totalPrecipProb = 0;
  let totalPrecipType = [];
  let totalPrecip = 0;
  let totalSnow = 0;
  let totalWindspeed = 0;
  let totalCloudCover = 0;
  let totalVisibility = 0;
  let totalConditions = [];
  let totalIcon = [];
  let totalTemp = 0;
  let totalFeelsLike = 0;

  dbResult.forEach((element) => {
    // console.log(element.temp);

    count++;
    totalPrecipProb += element.precipProb;
    totalPrecipType.push(element.precipType);
    totalPrecip += element.precip;
    totalSnow += element.snow;
    totalWindspeed += element.windspeed;
    totalCloudCover += element.cloudCover;
    totalVisibility += element.visibility;
    totalConditions.push(element.conditions);
    totalIcon.push(element.icon);
    totalTemp += element.temp;
    totalFeelsLike += element.feelsLike;
  })

  if (count === 0) {
    totalPrecipProb = -999;
    totalWindspeed = -999;
    totalCloudCover = -999;
    totalVisibility = -999;
    totalTemp = -999;
    totalFeelsLike = -999;

  } else {
    totalPrecipProb = totalPrecipProb / count;
    totalWindspeed = totalWindspeed / count;
    totalCloudCover = totalCloudCover / count;
    totalVisibility = totalVisibility / count;
    totalTemp = totalTemp / count;
    totalFeelsLike = totalFeelsLike / count;
  }


  // Flatten and take out repeats
  let tempArray = [];
  totalPrecipType = totalPrecipType.flat(2);
  totalPrecipType.forEach((element) => {
    tempArray.includes(element)
      ? null
      : tempArray.push(element);
  });
  totalPrecipType = tempArray;

  // Flatten, sort,  and find most frequent
  totalConditions = totalConditions.flat(2);
  totalConditions.sort((a, b) => a > b ? 1 : -1);
  totalConditions = findMostFrequent(totalConditions);

  totalIcon = totalIcon.flat(2);
  totalIcon.sort((a, b) => a > b ? 1 : -1);
  totalIcon = findMostFrequent(totalIcon);

  let resortDate = hourlyData.calcResortDate(resort, startEpoch)

  // Create weather object
  let tempDataObject = {
    key: resort.name + startEpoch,
    resort: resort.name,

    startEpoch: startEpoch,
    endEpoch: endEpoch,
    dateTimeEpoch: startEpoch,

    dayOfWeek: resortDate.day,
    date: resortDate.date,
    month: resortDate.month,
    year: resortDate.year,

    precipProb: totalPrecipProb,
    precip: totalPrecip,
    precipType: totalPrecipType,
    snow: totalSnow,
    windspeed: totalWindspeed,
    cloudCover: totalCloudCover,
    visibility: totalVisibility,
    conditions: totalConditions,
    icon: totalIcon,
    temp: totalTemp,
    feelsLike: totalFeelsLike,
  }



  return tempDataObject;
}

function findMostFrequent(array) {
  let currentData = array[0];
  let currentCount = 0;
  let mostFrequentData = array[0];
  let mostFrequentCount = 0;

  array.forEach((item) => {
    // check if new item
    if (item !== currentData) {
      // new data
      if (currentCount > mostFrequentCount) {
        mostFrequentData = currentData;
        mostFrequentCount = currentCount;
      } else {
        currentData = item;
        currentCount = 1;
      }
    } else {
      // same data - increment
      currentCount++;
    }

    // check if last item is most frequent
    if (currentCount > mostFrequentCount) {
      mostFrequentData = currentData;
      mostFrequentCount = currentCount;
    }
  });

  return mostFrequentData;
}

async function endPointReadDailyWeather(request, response, next) {

  try {
    let resortName = request.params.resortName;

    console.log(`******************************************** getting endpoint daily weather for ${resortName} on ${Date()} ********************`);

    // Set startDate to 6PM the previous day
    let startDate = calcResortStartTimeEpoch(resortName);


    // Filter for this resort only
    let dbResult = dailyWeather.filter((forecast) => forecast.resort === resortName);
    dbResult = dbResult.filter((forecast) => forecast.dateTimeEpoch >= startDate);
    dbResult.sort((a, b) => (a.dateTimeEpoch > b.dateTimeEpoch) ? 1 : -1);

    response.status(200).send(dbResult)

  } catch (error) {
    console.log(error.message, 'dailyWeather.js endPointReadDailyWeather');
    next(error);
  }
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

  // Calc hours to 6PM of previous day
  let hoursToDelete = resortDate.getUTCHours() + 6;

  let startTimeEpoch = currentDateEpoch - hoursToDelete * 3600000;

  return startTimeEpoch;
}

// Delay starting schedule to allow resort cache to update.  Set to after hourlyWeather starts.
setTimeout(updateDailyWeatherSchedule, 20000);

module.exports = { dbUpdateDailyWeather, endPointReadDailyWeather };