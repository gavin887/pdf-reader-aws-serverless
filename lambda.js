const serverless = require('serverless-http');
const app = require('./src/app');

module.exports.handler = (event, context) => {
    return serverless(app)(event, context);
};