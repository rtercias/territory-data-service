const functions = require('firebase-functions');
const { gqlServer } = require('./server');
const server = gqlServer();

// Graphql api
// https://us-east1-territory-data-service.cloudfunctions.net/api/
const api = functions
  .runWith({
    timeoutSeconds: 300,
  })
  .https.onRequest(server);

export { api };
