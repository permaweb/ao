
const express = require('express');
const bodyParser = require('body-parser');

const crankRoute = require('./routes/crank');
const errors = require('./errors/errors')

const app = express();
const PORT = 3004;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/crank', crankRoute);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

app.use(errors);