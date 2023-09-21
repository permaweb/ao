
const express = require('express');
const bodyParser = require('body-parser');

const baseRoute = require('./routes/base');
const writeRoute = require('./routes/write');
const errors = require('./errors/errors');

const app = express();
const PORT = 3004;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/', baseRoute);
app.use('/write', writeRoute);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

app.use(errors);