const { https } = require('firebase-functions');
const { gqlServer } = require('./server');
const cors = require('cors')({
  origin: true
});

const server = gqlServer();

// Graphql api
// https://us-east1-territory-data-service.cloudfunctions.net/api/
const api = https.onRequest(server);
export { api };
