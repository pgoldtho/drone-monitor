var expect  = require('chai').expect;
var request = require('request');
var app = require('../app')

var headersOpt = {
    "content-type": "application/json",
};

it('should create a new resource', function(done) {

  var requestBody = {"id": "FA929VNFRL", "epoch": 1566331632, "lat": 28.6589651, "lon": -80.8488282, "alt": 15};
  request(
    {
      method: 'post',
      url: 'http://localhost:3200/active',
      body: requestBody,
      headers: headersOpt,
      json: true
    }, (error, response, body) => {
      expect(response.statusCode).to.equal(201);
      done();
    }
  );
});
