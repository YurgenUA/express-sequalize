const express = require('express');
const router = require('./routes');
const bodyParser = require('body-parser');
const { sequelize } = require('./model')
const app = express();
app.use(bodyParser.json());
app.set('sequelize', sequelize)
app.set('models', sequelize.models)

app.use(router);
module.exports = app;
