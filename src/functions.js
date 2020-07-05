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
    if (allowedOrigins.indexOf(origin) > -1){
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Authorization, Origin, Referer, User-Agent, X-Requested-With, Content-Type, Accept');
    server();
  });
});
export { api };
