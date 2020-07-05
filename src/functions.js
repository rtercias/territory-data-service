const { https } = require('firebase-functions');
const { gqlServer } = require('./server');
const cors = require('cors')({
  origin: true
});

const server = gqlServer();

// Graphql api
// https://us-east1-territory-data-service.cloudfunctions.net/api/
const api = https.onRequest((req, res) => {
  cors(req, res, () => {
    const allowedOrigins = ['http://localhost:8080', 'http://192.168.1.205:8080', 'https://foreignfield.com'];
    const origin = req.headers.origin;

    res.set('Access-Control-Allow-Credentials', 'true');

    if (allowedOrigins.indexOf(origin) > -1){
      res.set('Access-Control-Allow-Origin', origin);
    }

    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'GET, POST');
      res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.set('Access-Control-Max-Age', '3600');
      res.status(204).send('');
    } else {
      res.send(server);
    }
  });
});
export { api };
