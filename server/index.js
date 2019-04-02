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

var distantReportSchema = new mongoose.Schema({
    epoch: Date,
    hex: String,
    flight: String,
    lat: Number,
    lon: Number,
    altitude: Number,
    distance: Number
});

var bearingReportSchema = new mongoose.Schema({
    epoch: Date,
    hex: String,
    flight: String,
    lat: Number,
    lon: Number,
    altitude: Number,
    distance: Number,
    bearing: Number
});

var Positions = mongoose.model('Positions', positionReportSchema);
var DistantReports = mongoose.model('DistantReports', distantReportSchema);
var BearingReports = mongoose.model('BearingReport', bearingReportSchema);

mongoose.connect(DATABASE_URL, { useNewUrlParser: true });
var db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => { console.log('db connected'); });

let metrics_checker = (error, response, body) => {
    let current_planes = JSON.parse(body);

    // Only parse reports that have a location
    current_planes = current_planes.filter(x => x.lat && x.lon);

    current_planes.forEach(x => {
        var calculatedEpoch = new Date();
        var distance = calcCrow(SENSOR_LOC.lat, SENSOR_LOC.lon, x.lat, x.lon);

        var distantReport = new DistantReports(x);
        distantReport.epoch = calculatedEpoch;
        distantReport.distance = distance;

        var bearing = Math.floor(calcBearing(SENSOR_LOC.lat, SENSOR_LOC.lon, x.lat, x.lon));
        var bearingReport = new BearingReports(x);
        bearingReport.epoch = calculatedEpoch;
        bearingReport.distance = distance;
        bearingReport.bearing = bearing;

        BearingReports.findOne({ bearing: bearing }, (err, oldBearingReport) => {
            if (oldBearingReport) {
                if (oldBearingReport.distance < bearingReport.distance) {
                    oldBearingReport.remove();
                    bearingReport.save(function (err, x) {
                        if (err) return console.error(err);
                    });
                }
            } else {
                bearingReport.save(function (err, x) {
                    if (err) return console.error(err);
                });
            }
        })

        DistantReports.findOne({ hex: x.hex }, null, null, (err, oldPosition) => {
            if (oldPosition) {
                if (oldPosition.distance < distantReport.distance) {
                    oldPosition.remove();
                    distantReport.save(function (err, x) {
                        if (err) return console.error(err);
                    });
                }

            } else {
                distantReport.save(function (err, x) {
                    if (err) return console.error(err);
                });
            }
        })
    });
}

setInterval(() => { request(CURRENT_TRAFFIC_URL, metrics_checker) }, 10000);

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
    return Math.round(d * 1000) / 1000;
}

function calcBearing(lat1, lng1, lat2, lng2) {
    var dLon = (lng2 - lng1);
    var y = Math.sin(dLon) * Math.cos(lat2);
    var x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    var brng = toDeg(Math.atan2(y, x));
    return 360 - ((brng + 360) % 360);
}

// Converts numeric degrees to radians
function toRad(deg) {
    return deg * Math.PI / 180;
}

// Converts numeric radians to degrees
function toDeg(rad) {
    return rad * 180 / Math.PI;
}