const express = require('express');
const path = require('path');
const http = require('http');

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
    http.get('http://71.244.212.145:8080/dump1090/data.json', (resp) => {
        let data = '';

        // A chunk of data has been recieved.
        resp.on('data', (chunk) => {
            data += chunk;
        });

        // The whole response has been received. Print out the result.
        resp.on('end', () => {
            res.json(JSON.parse(data));
        });

    }).on("error", (err) => {
        console.log("Error: " + err.message);
    });
})

app.listen(PORT, function () {
    console.info(`PID ${process.pid}: listening on port ${PORT}`);
});