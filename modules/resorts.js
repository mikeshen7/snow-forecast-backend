'use strict';

const resortDb = require("../models/skiResortDb");
const hourlyWeather = require('../modules/hourlyWeather');
const dailyWeather = require('../modules/dailyWeather');
const resortCache = require('../modules/resortCache');

// ******** FUNCTIONS ***************************
async function updateResortSchedule() {
  // 7200000 = 2 hrs
  // 300000 = 5 min
  setInterval(dbReadAllResort, 7200000);
}

async function dbCreateResort(resort) {
  // resort object: {
  //   name
  //   lat
  //   lon
  //   utc
  // }

  try {
    // create database entry
    let createdResort = await resortDb.create(resort);

    // update resorts cache
    dbReadAllResort();

    // get hourly weather
    // await hourlyWeather.apiReadHourlyWeather(resort.name);

    // calc daily weather
    // await dailyWeather.dbUpdateDailyWeather(resort.name);

    return createdResort;

  } catch (error) {
    console.log(error.message, 'resorts.js dbCreateResort');
  }
}

async function dbReadAllResort() {
  try {
    console.log(`******************************************** getting resorts on ${Date()} ********************`);
    resortCache['resorts'] = await resortDb.find({});


  } catch (error) {
    console.log(error.message, 'resorts.js dbReadAllResort');
  }
}

async function dbUpdateResort(request, response, next) {
  try {
    let resortName = request.params.resortName;
    let resortData = request.body;
    let updatedResort = await resortDb.findOneAndUpdate({ name: resortName }, resortData, { new: true, overwrite: true });
    response.status(200).send(updatedResort);

  } catch (error) {
    console.log(error.message, 'resorts.js dbUpdateResort');
    next(error);
  }
}

async function dbRemoveResort(request, response, next) {
  try {
    let resortName = request.params.resortName;
    let deletedResult = await resortDb.findOneAndDelete({ name: resortName });

    deletedResult === null
      ? response.status(200).send('Resort not found')
      : response.status(200).send('Resort Deleted')

  } catch (error) {
    console.log(error.message, 'resorts.js dbRemoveResort');
    next(error);
  }
}

// ******** ENDPOINT FUNCTIONS ***************************
async function endpointCreateResort(request, response, next) {  // post
  // request body: {
  //   name
  //   lat
  //   lon
  //   utc
  // }

  try {
    let resortToCreate = request.body;
    let createdResort = await dbCreateResort(resortToCreate);
    response.status(200).send(createdResort);

  } catch (error) {
    console.log(error.message, 'resorts.js endpointCreateResort');
    next(error);
  }
}

async function endpointReadAllResort(request, response, next) {
  try {
    response.status(200).send(resortCache['resorts']);

  } catch (error) {
    console.log(error.message, 'resorts.js endpointReadAllResort');
    next(error);
  }
}

async function endpointReadOneResort(request, response, next) {
  try {
    let resortName = request.params.resortName;
    let dbResult = resortCache['resorts'].filter((resort) => resort.name === resortName);

    dbResult.length === 0
      ? response.status(200).send('Resort not found')
      : response.status(200).send(dbResult)

  } catch (error) {
    console.log(error.message, 'resort.js endpointReadOneResort');
    next(error);
  }
}

async function endpointUpdateResort(request, response, next) {
  try {
    let resortName = request.params.resortName;
    let resortData = request.body;
    let updatedResort = await resortDb.findOneAndUpdate({ name: resortName }, resortData, { new: true, overwrite: true });
    dbReadAllResort();
    response.status(200).send(updatedResort);

  } catch (error) {
    console.log(error.message, 'resort.js endpointUpdateResort');
    next(error);
  }
}

async function endpointRemoveResort(request, response, next) {
  try {
    let resortName = request.params.resortName;
    let deletedResult = await resortDb.findOneAndDelete({ name: resortName });
    dbReadAllResort();

    deletedResult === null
      ? response.status(200).send('Resort not found')
      : response.status(200).send('Resort Deleted')

  } catch (error) {
    console.log(error.message, 'resort.js endpointRemoveResort');
    next(error);
  }
}

dbReadAllResort();
updateResortSchedule();

module.exports = { dbCreateResort, dbReadAllResort, dbUpdateResort, dbRemoveResort, endpointCreateResort, endpointReadAllResort, endpointReadOneResort, endpointUpdateResort, endpointRemoveResort };
