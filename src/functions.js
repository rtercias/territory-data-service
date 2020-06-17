import { https } from 'firebase-functions';
import { gqlServer } from './server';

const server = gqlServer();

// Graphql api
// https://us-east1-territory-data-service.cloudfunctions.net/api/
const api = https.onRequest(server);

export {api};
