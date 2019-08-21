# Drone Monitor

A company has a number of drones flying around the country. This system tracks the location of every drone in real-time.  Each drone is identified by its FAA registration number or tail number (if greater than 55 lb.) and  reports its geo-location coordinates to a central server in real-time through a cellular modem connection.

The results are displayed in a simple web application which displays the list of active drones as a table, by their unique identifiers, along with their location and current speed.

| ID | Time | Latitude | Longitude | Altitude (m) | Speed (km/h) | Rate of Climb (m/s)
| --- | -------- | -------- | --------- | ------------ | ------------ | ------------------
| FA929VNFRL | 17:45 | 28.6589651 | -80.8488282 | 15 | 30 | 0
| FA997PORSC | 17:41 | 28.6583363 | -80.8488429 | 30 | 0 | -1
| **FA996PORSC** | 17:43 | 28.6583363 | -80.8488429 | 10| **0** | **0**
| N32952 | 17:46 | 28.6583363 | -80.8488429 | 200 | 70 | 1

The table highlights drones that have not been moving for more than 10 seconds (i.e. the drone sent updates, but didn't move more that 1 meter).  Inactive drones are not displayed.  A drone is considered inactive after it lands at a company facility.  

The central server exposes a REST endpoint.  Drones POST their location to it as a JSON document similar to the one shown below.

```
{ "id": "FA929VNFRL",
  "epoch": "1566331632",
  "lat": "28.6589651",
  "lon": "-80.8488282",
  "alt": "15"}
```
Where *id* is the FAA identifier, *epoch* is the number of seconds since Jan 1, 1970, *lat* is the current latitude, *lon* is the current longitude and *alt* is the altitude in meters.  The system assumes latitude and longitude coordinates are expressed using the WGS84 coordinate system.

A GET request to the same endpoint returns a geoJSON FeatureCollection with each drone position described using Point geometry and its

```
{
  "type": "FeatureCollection",
  "features": [
  {
    "type": "Feature",
    "geometry": {
      "type": "Point",
      "coordinates": [-80.8488429, 28.6583363, 200]
    },
    "properties": {
      "id": "N32952"
      "epoch": "1566331632",
      "timestamp": "2019-08-20T20:07:12.000Z",
      "displayTime": "16:07:12",
      "speed": "70",
      "climbRate": "1",
      "active": "Y"
    }
  },
  {
    "type": "Feature",
    "geometry": {
      "type": "Point",
      "coordinates": [-80.8488282, 28.6589651, 15]
    },
    "properties": {
      "id": "FA929VNFRL"
      "epoch": "1566331632",
      "timestamp": "2019-08-20T20:07:12.000Z",
      "displayTime": "16:07:12",
      "speed": "30",
      "climbRate": "0",
      "active": "Y"
    }
  }
  ]
}
```

## Data Model

The system uses an in memory object to store the latest position and other properties described in the table below

| Field | Data Type | Required | Meaning
| ------ | --------- | -------- | -------
| id | String | Y | Primary key - FAA registration number or tail number (if greater than 55 lb.)
| epoch | Number | Y | Epoch timestamp from drone's system clock at time location coordinates were recorded
| latitude | Number | Y | Drone's WGS84 latitude coordinate
| longitude | Number | Y | Drone's WGS84 longitude coordinate
| altitude | Number | Y | Drone's elevation above sea level **(not ground level)**
| speed | Number | Y | Current speed in Km/h
| climbRate | Number | Y |Drone's rate of climb in meters per second. Negative numbers denote decent
| active | Boolean | Y | Is the drone flying at the moment?

## POST Processing

### Validation
For each POST request the system validates the input against a JSON schema (https://www.npmjs.com/package/express-json-validator-middleware). It returns a 400 (Bad Request) response if the schema does not validate.  Next it checks the epoch timestamp from the request against the current in-memory epoch for the drone.  It returns a 204 (No Content) response if the request epoch is earlier than the in-memory one.  

### Derived Fields
The drone's speed is calculated by taking the distance between its current location and the location recorded in memory (https://stackoverflow.com/questions/639695/how-to-convert-latitude-or-longitude-to-meters) divided by duration (the difference between the 2 timestamps).  The result is multiplied by 3.6 to produce a value in Km/h.  The climbRate is calculated by subtracting the previous altitude from the current one divided by the duration. The active flag is set to false when the drone is within 50m of a company facility and the altitude of the drone is within 2m of the elevation of that facility.

The in-memory value is updated once the derived fields have been calculated.  A 201 (Created) response is returned.

## GET Processing
For each GET request the system formats the in-memory values as a geoJSON FeatureCollection after converting the epoch timestamps to display values(https://stackoverflow.com/questions/847185/convert-a-unix-timestamp-to-time-in-javascript).

## UI Processing
The UI highlights drones that have not been moving for more than 10 seconds (the drone sent updates, but didn't move more that 1 meter). It does this if its horizontal speed is less than 0.36 km/h and its climbRate is between 0.1 and -0.1 meters per second.

## Protocol and Request Frequency
Cellular modem connections are expensive, therefore we need to make sure the drones report back their location using as little data as possible. Drones should be configured to POST their location using HTTPS every 30 seconds.  

An MQTT wrapper could be added as a separate module if HTTP requests prove to be unreliable or overly expensive.
