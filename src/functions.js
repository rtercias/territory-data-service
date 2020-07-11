const { https } = require('firebase-functions');
const { gqlServer } = require('./server');
const cors = require('cors')({
  origin: true
});

const server = gqlServer();

// Graphql api
// https://us-east1-territory-data-service.cloudfunctions.net/api/
const api = https.onRequest(server);

const sample = https.onRequest((req, res) => {
  cors(req, res, () => {
    res.send('Passed.');
  });
});
export { api, sample };
