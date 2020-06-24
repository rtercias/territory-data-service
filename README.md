# territory-data-service
GraphQL Service for MySQL territory database.

## Getting Started
These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

`git clone` this repository into your local machine

### Prerequisites
1. Node 8.6+
2. npm 5.6+
3. VPN connection to versacomputer.com
4. process.env variables on the server

### Installing

1. `npm i`
2. `npm start`

Sample query:
```
{
  territories (congId: 1) {
    name
    type
  }
}
```

## Deployment
(Requires npm 5.6+ and node 8.6+)
npm install -f
npm run build
node dist/index.js

## Built With

* [apollo-server-express](https://github.com/apollographql/apollo-server)

## Authors

* **Ryan Tercias**


## License

This project is licensed under the MIT License - see the [index.js](index.js) file for details
