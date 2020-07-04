const { https } = require('firebase-functions');
const { gqlServer } = require('./server');

const server = gqlServer();

// Graphql api
// https://us-east1-territory-data-service.cloudfunctions.net/api/
const api = https.onRequest((res, req) => {
  res.set('Access-Control-Allow-Origin', '*');
  return server;
});

export { api };
