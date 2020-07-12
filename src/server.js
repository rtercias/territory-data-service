/**
 * Copyright 2018 Territory Data Service
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES 
 * OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE 
 * OR OTHER DEALINGS IN THE SOFTWARE.
 */

const express = require('express');
const { config } = require('firebase-functions');
const mysql = require('mysql');
const { ApolloServer } = require('apollo-server-express');
const { promisify } = require('util');
const { resolvers, typeDefs } = require('./schema/schema');

export const conn = mysql.createPool({
  connectionLimit: 10,
  ssl: { rejectUnauthorized: false }, // TODO: add SSL certificate file here (see https://github.com/mysqljs/mysql#ssl-options)
  host: config().api.territory_server,
  user: config().api.territory_userid,
  password: config().api.territory_password,
  database: 'territory'
});

export function gqlServer() {
  const app = express();

  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true,
    playground: true,
  });

  conn.query = promisify(conn.query);
  apolloServer.applyMiddleware({ app, path: '/', cors: {
    credentials: true,
    allowedHeaders: ['Authorization'],
    origin: (origin, callback) => {
      const whitelist = [
        'http://localhost:8080',
        'http://192.168.1.205:8080',
        'https://foreignfield.com',
      ];

      if (whitelist.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  }});

  return app;
}

// To listen from a local server
// app.listen(5000, '192.168.1.205'); // or 'localhost'
