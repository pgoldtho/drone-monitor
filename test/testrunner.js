// **************************************************************
// End to End CRUD test for REST APIs.
// Note: the tests run in sequence and the failure of an early test may
// impact the result of laters ones.
// **************************************************************

var expect  = require('chai').expect;
var request = require('request');
var app = require('../app')

const HEADERS = {
    "content-type": "application/json",
};
const BASE_URL = 'http://localhost:3200/active';

it('POST invalid schema should fail with 400 status', (done) => {
  var requestBody = {"id": "FA929VNFRL", "epoch": "1566331632", "lat": 28.6589651, "lon": -80.8488282, "alt": 0};
  console.log('Review Error message:');
  request(
    {
      method: 'post',
      url: BASE_URL,
      body: requestBody,
      headers: HEADERS,
      json: true
    }, (error, response, body) => {
      expect(response.statusCode).to.equal(400);
      done();
    }
  );
});

it('POST should create a new resource', (done) => {
  var requestBody = {"id": "FA929VNFRL", "epoch": 1566331632, "lat": 28.6589651, "lon": -80.8488282, "alt": 0};
  request(
    {
      method: 'post',
      url: BASE_URL,
      body: requestBody,
      headers: HEADERS,
      json: true
    }, (error, response, body) => {
      expect(response.statusCode).to.equal(201);
      done();
    }
  );
});

it('POST duplicate should return 409 Conflict', (done) => {
  var requestBody = {"id": "FA929VNFRL", "epoch": 1566331632, "lat": 28.6589651, "lon": -80.8488282, "alt": 0};
  request(
    {
      method: 'post',
      url: BASE_URL,
      body: requestBody,
      headers: HEADERS,
      json: true
    }, (error, response, body) => {
      expect(response.statusCode).to.equal(409);
      done();
    }
  );
});

it ('GET should return a single drone', (done) => {
  request(
    {
      method: 'get',
      url: BASE_URL,
    }, (error, response, body) => {
      expect(response.statusCode).to.equal(200);
      var collection = JSON.parse(body);
      expect(collection.features.length).to.equal(1)
      //console.log(collection.features.length);
      done();
    }
  );
});

it ('Multiple POSTs should launch more drones', (done) => {
  var drones = [
    {"id": "FA997PORSC", "epoch": 1566331632, "lat": 28.6589651, "lon": -80.8488282, "alt": 0},
    {"id": "FA996PORSC", "epoch": 1566331632, "lat": 28.6589651, "lon": -80.8488282, "alt": 0},
    {"id": "N32952", "epoch": 1566331632, "lat": 28.6589651, "lon": -80.8488282, "alt": 0}
  ]
  drones.forEach(drone => {
    request(
      {
        method: 'post',
        url: BASE_URL,
        body: drone,
        headers: HEADERS,
        json: true
      }, (error, response, body) => {
        expect(response.statusCode).to.equal(201);

      }
    );

  })
  done();
});

it ('GET should return multiple drones', (done) => {
  request(
    {
      method: 'get',
      url: BASE_URL,
    }, (error, response, body) => {
      expect(response.statusCode).to.equal(200);
      var collection = JSON.parse(body);
      expect(collection.features.length).to.equal(4)
      done();
    }
  );
});

it ('GET drone by resource id should succeed', (done) => {
  request(
    {
      method: 'get',
      url: BASE_URL + '/FA997PORSC',
    }, (error, response, body) => {
      expect(response.statusCode).to.equal(200);
      var feature = JSON.parse(body);
      expect(feature.properties.id).to.equal('FA997PORSC')
      done();
    }
  );
});

it ('GET invalid drone id should return 404', (done) => {
  request(
    {
      method: 'get',
      url: BASE_URL + '/xxFA997PORSC',
    }, (error, response, body) => {
      expect(response.statusCode).to.equal(404);
      done();
    }
  );
});

it('PUT a duplicate should do nothing', (done) => {
  var requestBody = {"id": "FA929VNFRL", "epoch": 1566331632, "lat": 28.6589651, "lon": -80.8488282, "alt": 0};
  request(
    {
      method: 'put',
      url: BASE_URL + '/FA929VNFRL',
      body: requestBody,
      headers: HEADERS,
      json: true
    }, (error, response, body) => {
      expect(response.statusCode).to.equal(204);
      done();
    }
  );
});

it('PUT invalid endpoint should return 404', (done) => {
  var requestBody = {"id": "FA929VNFRL", "epoch": 1566331632, "lat": 28.6589651, "lon": -80.8488282, "alt": 0};
  request(
    {
      method: 'put',
      url: BASE_URL + '/xxFA929VNFRL',
      body: requestBody,
      headers: HEADERS,
      json: true
    }, (error, response, body) => {
      expect(response.statusCode).to.equal(404);
      done();
    }
  );
});

it('PUT Drone in new location (climbs 30 meters and travels 70 meters in 30 seconds)', (done) => {
  var requestBody = {"id": "FA929VNFRL", "epoch": 1566331662, "lat": 28.6583363, "lon": -80.8488429, "alt": 30};
  request(
    {
      method: 'put',
      url: BASE_URL + '/FA929VNFRL',
      body: requestBody,
      headers: HEADERS,
      json: true
    }, (error, response, body) => {
      expect(response.statusCode).to.equal(201);
      done();
    }
  );
});

it('Verify climbRate = 1 meter/sec and speed = 8 km/h', (done) => {
  request(
    {
      method: 'get',
      url: BASE_URL + '/FA929VNFRL',
    }, (error, response, body) => {
      expect(response.statusCode).to.equal(200);
      var location = JSON.parse(body);
      expect(location.properties.climbRate).to.equal(1);
      expect(Math.round(location.properties.speed, 1)).to.equal(8);
      done();
    }
  );
});

it('DELETE invalid endpoint should return 404', (done) => {
  request(
    {
      method: 'delete',
      url: BASE_URL + '/xxFA929VNFRL',
      headers: HEADERS,
      json: true
    }, (error, response, body) => {
      expect(response.statusCode).to.equal(404);
      done();
    }
  );
});

it('DELETE valid endpoint should return 200', (done) => {
  request(
    {
      method: 'delete',
      url: BASE_URL + '/FA929VNFRL',
      headers: HEADERS,
      json: true
    }, (error, response, body) => {
      expect(response.statusCode).to.equal(200);
      done();
    }
  );
});

it ('GET deleted drone should return 404', (done) => {
  request(
    {
      method: 'get',
      url: BASE_URL + '/FA929VNFRL',
    }, (error, response, body) => {
      expect(response.statusCode).to.equal(404);
      done();
    }
  );
});
