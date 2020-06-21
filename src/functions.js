import { https } from 'firebase-functions';
import { gqlServer } from './server';

const server = gqlServer();

// Graphql api
// https://us-east1-territory-data-service.cloudfunctions.net/api/
const api = https.onRequest(server);
const helloEnvVariables = https.onRequest((req, res) => {
  let server = process.env.TERRITORY_SERVER;
  let userid = process.env.TERRITORY_USERID;
  res.status(200).send(`Function My env vars: ${server}, ${userid}`);
});
export { api, helloEnvVariables };
