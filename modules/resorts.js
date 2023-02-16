'use strict';

const db = require("../models/skiResortDb");
const weather = require('../modules/weather');

async function create(request, response, next) {  // post
  try {
    let createdResort = await db.create(request.body);
    await weather.getWeather(request.body.name);
    response.status(200).send(createdResort);

  } catch (error) {
    console.log(error.message);
    next(error);
  }
}

async function readAll(request, response, next) {
  try {
    let dbResult = await db.find({});
    response.status(200).send(dbResult);

  } catch (error) {
    console.log(error.message);
    next(error);
  }
}

async function readOne(request, response, next) {
  try {
    let resortName = request.params.resortName;
    let dbResult = await db.findOne({ name: resortName });

    dbResult === null
      ? response.status(200).send('Resort not found')
      : response.status(200).send(dbResult)

  } catch (error) {
    console.log(error.message);
    next(error);
  }
}

async function update(request, response, next) {
  try {
    let resortName = request.params.resortName;
    let resortData = request.body;
    let updatedResort = await db.findOneAndUpdate({ name: resortName }, resortData, { new: true, overwrite: true });
    response.status(200).send(updatedResort);

  } catch (error) {
    console.log(error.message);
    next(error);
  }
}

async function remove(request, response, next) {
  try {
    let resortName = request.params.resortName;
    let deletedResult = await db.findOneAndDelete({ name: resortName });

    deletedResult === null
      ? response.status(200).send('Resort not found')
      : response.status(200).send('Resort Deleted')

  } catch (error) {
    console.log(error.message);
    next(error);
  }
}

module.exports = { create, readAll, readOne, update, remove };
