//This function takes in latitude and longitude of two location and returns the distance between them as the crow flies (in km)
exports.calcCrow = function (lat1, lon1, lat2, lon2) {
    var earth_radius = 3958.8; // miles
    var dLat = toRad(lat2 - lat1);
    var dLon = toRad(lon2 - lon1);
    var lat1 = toRad(lat1);
    var lat2 = toRad(lat2);

    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = earth_radius * c;
    return Math.round(d * 1000) / 1000;
}

exports.calcBearing = function (lat1, lng1, lat2, lng2) {
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