const express = require('express');
const path = require('path');
const request = require('request');
const mongoose = require('mongoose');

const CURRENT_TRAFFIC_URL = 'http://71.244.212.145:8080/dump1090/data.json';
const DATABASE_URL = process.env.DATABASE_URL

const SENSOR_LOC = { lat: 39.24, lon: -76.73 };

var positionReportSchema = new mongoose.Schema({
    epoch: Date,
    hex: String,
    flight: String,
    lat: Number,
    lon: Number,
    altitude: Number,
    vert_rate: Number,
    track: Number,
    validtrack: Number,
    speed: Number
});

var Positions = mongoose.model('Positions', positionReportSchema);

mongoose.connect(DATABASE_URL, { useNewUrlParser: true });
var db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => { console.log('db connected'); });

let metrics_checker = (error, response, body) => {
    let current_planes = JSON.parse(body);

    // Only parse reports that have a location
    current_planes = current_planes.filter(x => x.lat && x.lon);

    current_planes.forEach(x => {
        var position = new Positions(x);
        position.epoch = new Date();
        position.save(function (err, x) {
            if (err) return console.error(err);
        });
    });
}

function plane_timer() {
    request(CURRENT_TRAFFIC_URL, metrics_checker);
}

setInterval(plane_timer, 5000);

//
// START EXPRESS
//
const PORT = process.env.PORT || 5000;
const app = express();

// Priority serve any static files.
app.use(express.static(path.resolve(__dirname, '../client/')));

app.use(express.json());

app.get('/api/v1/test', async (req, res) => {
    res.json({ "response": "coming back." });
})

app.get('/api/v1/current_traffic', async (req, res) => {
    request(CURRENT_TRAFFIC_URL, function (error, response, body) {
        let json = JSON.parse(body);
        res.json(json);
    });
})

app.get('/api/v1/furthest_contact', async (req, res) => {
    Positions.find({}, function (err, allContacts) {
        if (err) console.log(err);

        let longestDistance = 0;

        const contacts = allContacts.filter(x => x.lat && x.lon);

        contacts.forEach(x => {
            let currDistance = calcCrow(SENSOR_LOC.lat, SENSOR_LOC.lon, x.lat, x.lon)
            if (currDistance > longestDistance) {
                longestDistance = currDistance
            }
        });

        res.send(`Longest distance calculated at: ${longestDistance} kilometers.`);
    });
})

app.listen(PORT, function () {
    console.info(`PID ${process.pid}: listening on port ${PORT}`);
});

//This function takes in latitude and longitude of two location and returns the distance between them as the crow flies (in km)
function calcCrow(lat1, lon1, lat2, lon2) {
    var R = 6371; // km
    var dLat = toRad(lat2 - lat1);
    var dLon = toRad(lon2 - lon1);
    var lat1 = toRad(lat1);
    var lat2 = toRad(lat2);

    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d;
}

// Converts numeric degrees to radians
function toRad(Value) {
    return Value * Math.PI / 180;
}