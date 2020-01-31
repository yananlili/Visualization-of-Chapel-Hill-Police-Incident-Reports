/*
 * Map preparation
 */
// initialize the map
var mymap = L.map('mapid').setView([35.913200, -79.055847], 12);

// add the tile layer to the map
L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox.streets',
    accessToken: 'sk.eyJ1IjoiemhlcHUiLCJhIjoiY2puaTBtZ3V5MDE0NjN3bzU5aDczM3p5NiJ9.-XZf8bZb9qomobINAOjXKQ'
}).addTo(mymap);

// popup for a click event on the map to show latitude and longitude
var popup = L.popup();

function onMapClick(e) {
    popup
        .setLatLng(e.latlng)
        .setContent("You clicked the map at " + e.latlng.toString())
        .openOn(mymap);
}

mymap.on('click', onMapClick);

/*
 * Do something on the map
 */
// circle style
var geojsonMarkerOptions = {
    radius: 3,
    fillColor: "#ff7800",
    color: "#000",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8
};
var markers = L.markerClusterGroup({
        spiderfyShapePositions: function(count, centerPt) {
            var distanceFromCenter = 35,
                markerDistance = 45,
                lineLength = markerDistance * (count - 1),
                lineStart = centerPt.y - lineLength / 2,
                res = [],
                i;

            res.length = count;

            for (i = count - 1; i >= 0; i--) {
                res[i] = new Point(centerPt.x + distanceFromCenter, lineStart + markerDistance * i);
            }

            return res;
        }
});
class MapVis {
    constructor(){
        this.year = '2017';
        this.hour_of_occurence = 1; // set night as default
        this.victim = 0; // set victim doesn't exist as default
        this.victim_race = 'A';
        this.victim_sex = 'F';
        this.data_url = './data/police-incident-reports-written.csv';
    }

    setYear(new_year){
        this.year = new_year;
        this.render();
    }
    setTime(new_time){
        this.hour_of_occurence = new_time;
        this.render();
    }

    setVictim(victim_exists){
        this.victim = victim_exists;
        if (victim_exists == 1) {
            document.getElementById('victim_race').removeAttribute('disabled');
            document.getElementById('victim_sex').removeAttribute('disabled');
        } else {
            document.getElementById('victim_race').setAttribute('disabled', 'disabled');
            document.getElementById('victim_sex').setAttribute('disabled', 'disabled');
        }
        this.render();
    }
    setVictimSex(new_sex){
        this.victim_sex = new_sex;
        this.render();
    }
    setVictimRace(new_race){
        this.victim_race = new_race;
        this.render();
    }

    render(){
        d3.selectAll("svg").remove();
        var thisvis = this;
        markers.clearLayers();
        d3.csv(this.data_url, // got to the url
            function (datum) { // d is one row of the csv file, d is an object
                var month = datum.DateOfOccurence.substring(0, datum.DateOfOccurence.lastIndexOf('-'));
                return {
                    incidentid: datum.IncidentID,
                    agency: datum.Agency,
                    offence: datum.Offense,
                    category: datum.Category,
                    street: datum.Street,
                    city: datum.City,
                    state: datum.State,
                    longitude: datum.Longitude,
                    latitude: datum.Latitude,
                    forcible: datum.Forcible,
                    maps: datum.maps,
                    date_of_report: datum.DateOfReport,
                    hour_of_report: datum.HourOfReport,
                    date_of_occurence: datum.DateOfOccurence,
                    hour_of_occurence: datum.HourOfOccurence,
                    date_found: datum.DateFound,
                    hour_found: datum.HourFound,
                    apartment: datum.Apartment,
                    zipcode: datum.Zipcode,
                    reported_as: datum.ReportedAs,
                    premise_description: datum.PremiseDescription,
                    victim_age: datum.VictimAge,
                    weapon_description: datum.WeaponDescription,
                    victim_race: datum.VictimRace,
                    victim_sex: datum.VictimGender,
                    month: month, // 2017-06, only the year and month
                }
            }).then(function (data) {

            // plot points on the map
            data.forEach(function (value) {

            function addIncidents() {
                var latlng = L.latLng(value.latitude, value.longitude);
                var marker = L.circleMarker(latlng, geojsonMarkerOptions)
                    .bindTooltip("<b>Incident ID</b>: " + value.incidentid + "<br>" +
                                "<b>Victim race</b>: " + value.victim_race + "<br>" +
                            "<b>Victim sex</b>: " + value.victim_sex + "<br>" +
                            "<b>Agency</b>: " + value.agency + "<br>" +
                            "<b>Date of Occurence</b>: " + value.date_of_occurence + "<br>" +
                            "<b>Hour of Occurence</b>: " + value.hour_of_occurence);
                markers.addLayer(marker);
            }
            var date = value.date_of_occurence.substring(0,4);

            // set occurence_time
            var index = value.hour_of_occurence.indexOf(':');
            var occurence_time = value.hour_of_occurence.substring(0,index);
            if ((occurence_time >= 19 && occurence_time <= 23) ||
                (occurence_time >= 0 && occurence_time <= 3)){ // occurence_time: 7pm - 23pm or 0am -3am
                occurence_time = 1;
            } else {
                occurence_time = 0;
            }

            // set victim
            var victim = 1;
            if (value.victim_age == "" && value.victim_sex == "" && value.victim_race == "") {
                victim = 0;
            }

            if (value.latitude != "" && value.longitude != "" &&
                date == thisvis.year && occurence_time == thisvis.hour_of_occurence &&
                victim == thisvis.victim) {
                if (thisvis.victim == 1) {
                    if (value.victim_sex == thisvis.victim_sex && value.victim_race == thisvis.victim_race){
                        addIncidents();
                    }
                } else {
                    addIncidents();
                }
            }

        }) // end for 'foreach'
            mymap.addLayer(markers);

            // draw the vertical bar chart of time trends on the right panel
            // step1: extract the array of month from the 'data'
            var month_map = data.filter(function (value) {
                if(value.month.substring(0,4) == thisvis.year){
                    return value;
                }
            }).map(function (value) {
                return {
                    month: value.month.substring(value.month.indexOf('-') + 1), // extract only the month
                    count: 0,
                };
            });

            var map = d3.map();

            month_map.forEach(function (value) {
                if (map.has(value.month)) {
                    map.set(value.month, map.get(value.month) + 1);
                } else {
                    map.set(value.month, 1);
                }
            });

            // step2: draw the diagram
            // set margin
            var margin = ({top: 50, right: 50, bottom: 50, left: 50})
            var height = 400;
            var width = document.getElementById('incident_type').getBoundingClientRect().width;

            var x = d3.scaleBand()
                .domain(map.entries().sort(function (a, b) { return d3.ascending(a.key, b.key) }).map(function (value) { console.log(value.key); return value.key; }))
                .range([margin.left, width - margin.right]).padding(0.1);

            // set y scale
            var y = d3.scaleLinear()
                .domain([0, d3.max(map.entries().map(function (value) { return value.value; }), function (value) {
                    console.log(value);
                    return value;
                })])
                .range([height - margin.bottom, margin.top]);


            // add a svg first
            var svg = d3.select('#incident_type').append('svg')
                .attr('height', height)
                .attr('width', width)
                .append("g")
                .attr("fill", "steelblue")
                .selectAll("rect").data(map.entries()).enter().append("rect")
                .attr("x", function (d) {
                    return x(d.key);
                })
                .attr("y", function (d) {
                    return y(d.value);
                })
                .attr("height", function (d) {
                    return y(0) - y(d.value);
                })
                .attr("width", x.bandwidth());

            // x-axis
            var xAxis = function (g) {
                g.attr("transform", "translate(0," +(height - margin.bottom)+")")
                .call(d3.axisBottom(x));
            }
            svg.append("g")
                .call(xAxis);

            svg.append("text")
                .attr("class", "axis-label")
                .attr("y", height - 5)
                .attr("x",0 + (width / 2))
                .style("text-anchor", "middle")
                .text("Month");

            // y-axis
            var yAxis = function (g) {
                g.attr("transform", "translate("+margin.left+",0)")
                .call(d3.axisLeft(y));
            }
            svg.append("text")
                .attr("transform", "rotate(90)")
                .attr("class", "axis-label")
                .attr("y", -5)
                .attr("x",0 + (height / 2))
                .style("text-anchor", "middle")
                .text("Number of incidents");

            svg.append("g")
                .call(yAxis);

            // svg.exit().remove();

        });
    }
}

// work with geoJSON
// get data from the json file through d3.json
// var geoJson = './data/police-incident-reports-written.geojson';

// d3.json(geoJson, function (d) {
//
//     // construct json objects
//     var incidents = d.features;
//     // console.log(incidents);
//
//     // circle style
//     var geojsonMarkerOptions = {
//         radius: 3,
//         fillColor: "#ff7800",
//         color: "#000",
//         weight: 1,
//         opacity: 1,
//         fillOpacity: 0.8
//     };
//
//     // draw circles on the map
//     L.geoJSON(incidents, {
//         pointToLayer: function (feature, latlng) {
//             return L.circleMarker(latlng, geojsonMarkerOptions)
//                 .addTo(mymap)
//                 .bindTooltip("incident ID: " + feature.properties.incidentid +
//                     "<br />" + "weapon_description: " + feature.properties.weapon_description +
//                     "<br />" + "street: " + feature.properties.street +
//                     "<br />" + "offense: " + feature.properties.offense +
//                     "<br />" + "victim_sex: " + feature.properties.victim_sex +
//                     "<br />" + "victim_age: " + feature.properties.victim_age +
//                     "<br />" + "victim_race: " + feature.properties.victim_race +
//                     "<br />" + "hour_of_report: " + feature.properties.hour_of_report);
//         }
//     }).addTo(mymap);
// });