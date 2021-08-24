const express = require("express");
const bodyparser = require("body-parser");
const port = process.env.PORT || 3200;
const util = require('util')

// Use node-cache to store state as an in-memory object
const NodeCache = require( "node-cache" );
const droneCache = new NodeCache();

// Use JSON schema to validate POST and PUT requests from drones
var { Validator, ValidationError } = require('express-json-validator-middleware');
var validator = new Validator({allErrors: true});
var validate = validator.validate;

const DroneSchema = {
  "type": "object",
  "required": ['id', 'epoch', 'lat', 'lon', 'alt'],
  "properties": {
    "id": { "type": "string" },
    "epoch": { "type": "number" },
    "lat": { "type": "number" },
    "lon": { "type": "number" },
    "alt": { "type": "number" }
  }
}

// Initialize express
const app = express();
app.use(bodyparser.json());

// *********************************************************
// Helper Functions
// *********************************************************

// Format drone record as geoJSON string
function getDroneFeature(drone){
  const droneRecord = droneCache.get(drone);
  if (droneRecord === undefined) {
    return;
  }
  var timestamp = new Date(droneRecord.epoch * 1000).toISOString().slice(0, 19).replace('T', ' ')
  var geoJSON = {
    "type": "Feature",
    "geometry": {
      "type": "Point",
      "coordinates": [droneRecord.longitude, droneRecord.latitude, droneRecord.altitude]
    },
    "properties": {
      "id": droneRecord.id,
      "epoch": droneRecord.epoch,
      "timestamp": timestamp,
      "displayTime": timestamp.slice(11, 19),
      "speed": droneRecord.speed,
      "climbRate": droneRecord.climbRate
    }
  }
  return geoJSON;
}

// Calculate distance between 2 spatial coordinates
// https://stackoverflow.com/questions/639695/how-to-convert-latitude-or-longitude-to-meters
function distanceBetweenGeoPoints(lat1, lon1, lat2, lon2){
    var R = 6378.137; // Radius of earth in KM
    var dLat = lat2 * Math.PI / 180 - lat1 * Math.PI / 180;
    var dLon = lon2 * Math.PI / 180 - lon1 * Math.PI / 180;
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var d = R * c;
    return d * 1000; // meters
}

// Format drone records as geoJSON FeatureCollection string
function activeDrones(){
  var droneJSON = {
    "type": "FeatureCollection",
    "features": []
  }
  var droneList = droneCache.keys();
  droneList.forEach(drone => {
    droneJSON.features.push(getDroneFeature(drone))
  })
  return droneJSON;
}

// Save drone record as in memory object
function writeDroneRecord(res, id, epoch, lat, lon, alt, speed, climbRate){
  const droneObj = {
    "id": id,
    "epoch": epoch,
    "latitude": lat,
    "longitude": lon,
    "altitude": alt,
    "speed": speed,
    "climbRate": climbRate
  };
  droneCache.set(id, droneObj, function (err, success){
    if (!err && success) {
      res.status(201).send('valid');
    } else {
      console.error(util.inspect(err, {showHidden: false, depth: null}));
      res.status(500).send('invalid');
    }
  });
}


// *********************************************************
// REST API HTTP routes
// *********************************************************

// Create (launch) a new drone
app.post('/active', validate({body: DroneSchema}), (req, res) => {
  const drone = req.body;
  existingRecord = droneCache.get(drone.id);
  if (existingRecord) {
    return res.status(409).send('invalid');
  } else {
    writeDroneRecord(res, drone.id, drone.epoch, drone.lat, drone.lon, drone.alt, 0 , 0);
  }
});

// Retrieve all active drones
app.get('/active', (req, res) => {
  res.status(200).send(activeDrones());
});

// Retrieve an individual drone
app.get('/active/:id', (req, res) => {
  const drone = getDroneFeature(req.params.id)
  if (drone) {
    res.status(200).send(drone);
  } else {
    res.status(404).send('invalid');
  }
});

// Update drone location
app.put('/active/:id', validate({body: DroneSchema}), (req, res) => {
  const drone = req.body;
  const existingDroneRecord = droneCache.get(drone.id);
  if (existingDroneRecord === undefined || drone.id !== req.params.id) {
    return res.status(404).send('invalid');
  }
  // do nothing if new position is older than existing record
  if (drone.epoch <= existingDroneRecord.epoch) {
    return res.status(204).send('valid');
  }

  // calculate speed and rate of climb
  const distanceTraveled = distanceBetweenGeoPoints(
    existingDroneRecord.latitude, existingDroneRecord.longitude, drone.lat, drone.lon
  );
  const heightClimbed = drone.alt - existingDroneRecord.altitude;
  const duration = drone.epoch - existingDroneRecord.epoch;
  writeDroneRecord(res, drone.id, drone.epoch, drone.lat, drone.lon, drone.alt,
    distanceTraveled/duration * 3.6 , heightClimbed/duration);
});

// Delete active drone (e.g. after landing)
app.delete('/active/:id', (req, res) => {
  droneCache.del(req.params.id, (err, count) => {
    if ( !err && count > 0) {
      res.status(200).send('valid');
    } else {
      res.status(404).send('invalid');
    }
  });
});

// Error handler JSON Schema errors
app.use(function(err, req, res, next) {
    if (err instanceof ValidationError) {
        console.error(req.body);
        console.error(util.inspect(err.validationErrors, {showHidden: false, depth: null}));
        res.status(400).send('invalid');
        next();
    }
    else next(err); // pass error on if not a validation error
});

// Serve single page application on '/' 
app.get('/', (req,res) => {
  res.sendFile('index.html', { root: __dirname });
});

app.listen(port, () => {
  console.log(`running at port ${port}`);
});
