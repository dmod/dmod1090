const utilities = require('./utilities.js');

const express = require('express');
const path = require('path');
const request = require('request');

const SENSOR_LOC = { lat: 39.24, lon: -76.73 };
const CURRENT_TRAFFIC_URL = 'http://71.244.212.145:3333/dump1090/data/aircraft.json';

// START EXPRESS
const PORT = process.env.PORT || 5000;
const app = express();

// Priority serve any static files.
app.use(express.static(path.resolve(__dirname, '../client/')));

app.use(express.json());

app.get('/api/v1/test', async (req, res) => {
    res.json({ 'response': 'coming back.' });
});

app.get('/api/v1/current_traffic', async (req, res) => {
    request(CURRENT_TRAFFIC_URL, function (error, response, body) {

        if (error) {
            return console.error('Error:', error);
        }

        const rawTrafficJSON = JSON.parse(body).aircraft;
        res.json(rawTrafficJSON.filter(checkValidPosition));
    });
});

app.listen(PORT, function () {
    console.info(`PID ${process.pid}: listening on port ${PORT}`);
});

function checkValidPosition(position_report) {
    const distance = utilities.calcCrow(SENSOR_LOC.lat, SENSOR_LOC.lon, position_report.lat, position_report.lon);
    return distance < 220; // Reports over 220 miles away aren't typically possible and usually the result of malformed data
};
