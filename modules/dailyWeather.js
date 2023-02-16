'use strict';

// ******** REQUIRES ****************************
const axios = require('axios');

// *** Database connection and test
const skiResortDb = require('../models/skiResortDb');
// const weather = require('../modules/weather');
const hourlyWeatherDb = require('../models/hourlyWeatherDb');
const dailyWeatherDb = require('../models/dailyWeatherDb');


async function weatherSchedule() {
  // 7200000 = 2 hrs
  // 300000 = 5 min
  setInterval(updateDailyWeather, 1800000);
}

async function updateDailyWeather() {
  // divde day into 3 sections:
  // 6AM - 12PM (AM, 6 hrs)
  // 12PM - 6PM (PM, 6 hrs)
  // 6 PM - 6AM (Night, 12 hrs)

  // Set start date to yesterday at 18:00
  let currentDay = new Date(Date.now());
  currentDay.setDate(currentDay.getDate() - 1);
  currentDay.setHours(18, 0, 0, 0);

  let startEpoch = currentDay[Symbol.toPrimitive]('number');
  let endEpoch;

  // other variables
  let dailyWeatherArray = [];
  let tempDataArray = [];
  let tempDataObject = {};
  let averageData = {};

  // Create array of resort names
  let resorts = [];
  let temp = await skiResortDb.find();
  resorts = temp.map((resort) => {
    return resort.name;
  })


  // Loop through all resorts
  resorts.forEach(async (resort) => {
    // Get database weather info starting from startEpoch, sorted by epoch time
    let resortWeather = await getDatabaseWeather(resort, startEpoch);

    for (let day = 0; day < 15; day++) {
      // *** Calc for 6PM to 6AM
      // currentDay is currently Date object at 18:00
      startEpoch = currentDay[Symbol.toPrimitive]('number');
      endEpoch = startEpoch + 43200000;
      tempDataObject = calcDailyWeather(resort, resortWeather, currentDay, startEpoch, endEpoch);
      tempDataObject.time = 'Night';
      dailyWeatherArray.push(tempDataObject);

      // *** Calc for 6AM to 12PM
      currentDay.setHours(currentDay.getHours() + 12);
      startEpoch = currentDay[Symbol.toPrimitive]('number');
      endEpoch = startEpoch + 21600000;
      tempDataObject = calcDailyWeather(resort, resortWeather, currentDay, startEpoch, endEpoch);
      tempDataObject.time = 'AM';
      dailyWeatherArray.push(tempDataObject);

      // *** Calc for 12PM to 6PM
      currentDay.setHours(currentDay.getHours() + 6);
      startEpoch = currentDay[Symbol.toPrimitive]('number');
      endEpoch = startEpoch + 21600000;
      tempDataObject = calcDailyWeather(resort, resortWeather, currentDay, startEpoch, endEpoch);
      tempDataObject.time = 'PM';
      dailyWeatherArray.push(tempDataObject);

    }

    // TODO: Update / create database
    dailyWeatherArray.forEach(async (forecast, index) => {
      // TODO: see if key exists in database
      let newData = await dailyWeatherDb.findOne({ key: forecast.key });

      // TODO: if key exists, update.  If not, create.
      if (newData === null) {
        await dailyWeatherDb.create(forecast);
        // console.log('create');
      } else {
        await dailyWeatherDb.findOneAndUpdate({ key: forecast.key }, forecast, { new: true, overwrite: true })
        // console.log('update');
      }
    })
  })
}

function calcDailyWeather(resort, weatherArray, currentDay, startEpoch, endEpoch) {
  // Filter data for specific time period
  let tempDataArray = weatherArray.filter(hourlyWeather => (hourlyWeather.dateTimeEpoch >= startEpoch && hourlyWeather.dateTimeEpoch < endEpoch));

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

  tempDataArray.forEach((element) => {
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

  // Create weather object
  let tempDataObject = {
    key: resort + startEpoch,
    resort: resort,
    dateTimeEpoch: startEpoch,
    dayOfWeek: currentDay.getDay() + 1,
    date: currentDay.getDate(),
    month: currentDay.getMonth() + 1,
    year: currentDay.getFullYear(),
    precipProb: totalPrecipProb / count,
    precip: totalPrecip,
    precipType: totalPrecipType,
    snow: totalSnow,
    windspeed: totalWindspeed / count,
    cloudCover: totalCloudCover / count,
    visibility: totalVisibility / count,
    conditions: totalConditions,
    icon: totalIcon,
    temp: totalTemp / count,
    feelsLike: totalFeelsLike / count,
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

async function getDatabaseWeather(resortName, startEpoch) {
  try {
    let dbResult = await hourlyWeatherDb.find({ resort: resortName, dateTimeEpoch: { $gte: startEpoch } });
    dbResult.sort((a, b) => (a.dateTimeEpoch > b.dateTimeEpoch) ? 1 : -1);
    // console.log('get getDatabaseWeather', dbResult);
    return dbResult;
  } catch (error) {
    console.log(error.message);
  }
}

weatherSchedule();
updateDailyWeather();

module.exports = { updateDailyWeather };