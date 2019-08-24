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

const app = express();
app.use(bodyparser.json());

app.post('/active', validate({body: DroneSchema}), function (req, res) {
  const drone = req.body;
  const droneObj = {
    "id": drone.id,
    "epoch": drone.epoch,
    "latitude": drone.lat,
    "longitude": drone.lon,
    "altitude": drone.alt,
    "speed": 0,
    "climbRate": 0
  };
  droneCache.set(drone.id, droneObj, function (err, success){
    if (!err && success) {
      res.status(201).send('valid');
    } else {
      console.error(util.inspect(err, {showHidden: false, depth: null}));
      res.status(500).send('invalid');
    }
  });
});

app.get('/active', (req, res) => {
  var droneList = droneCache.keys();
  res.status(200).send(droneList);
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

app.listen(port, () => {
  console.log(`running at port ${port}`);
});
