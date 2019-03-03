const express = require('express');
const path = require('path');
const request = require('request');

const CURRENT_TRAFFIC_URL = 'http://71.244.212.145:8080/dump1090/data.json';

let all_planes = {};

let metrics_checker = (error, response, body) => {
    //console.log('error:', error);
    //console.log('statusCode:', response && response.statusCode);
    console.log('all_planes size:', Object.keys(all_planes).length);

    let current_planes = JSON.parse(body);
    current_planes.forEach(x => {
        if (all_planes[x.hex]) {
            //console.log('we already know about ' + x.hex);
        } else {
            console.log(x.hex + ' is NEW!');
            all_planes[x.hex] = x;
        }
    });
}

function plane_timer() {
    request(CURRENT_TRAFFIC_URL, metrics_checker);
}

setInterval(plane_timer, 10000);

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
    console.log("someone called current_traffic");
    request(CURRENT_TRAFFIC_URL, function (error, response, body) {
        console.log('error:', error);
        console.log('statusCode:', response && response.statusCode);
        let json = JSON.parse(body);
        res.json(json);
    });
})

app.listen(PORT, function () {
    console.info(`PID ${process.pid}: listening on port ${PORT}`);
});