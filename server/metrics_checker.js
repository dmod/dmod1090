// ONLY USED FOR TRAFFIC STATISTICS -> MONGO DB

const DATABASE_URL = process.env.DATABASE_URL
import { Schema, model, connect, connection } from 'mongoose';

var positionReportSchema = new Schema({
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

var distantReportSchema = new Schema({
    epoch: Date,
    hex: String,
    flight: String,
    lat: Number,
    lon: Number,
    altitude: Number,
    distance: Number
});

var Positions = model('Positions', positionReportSchema);
var DistantReports = model('DistantReports', distantReportSchema);

connect(DATABASE_URL, { useNewUrlParser: true });
var db = connection;

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
