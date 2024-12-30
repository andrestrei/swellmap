import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import vectorTileLayer from 'leaflet-vector-tile-layer';
import 'leaflet-timedimension';
import axios from 'axios';
import { getStyle, colorPalette } from './styleConfig';
import { throttle } from 'throttle-debounce';

L.Map.include({
    _initControlPos: function () {
        var corners = this._controlCorners = {},
            l = 'leaflet-',
            container = this._controlContainer =
                L.DomUtil.create('div', l + 'control-container', this._container);

        function createCorner(vSide, hSide) {
            var className = l + vSide + ' ' + l + hSide;

            corners[vSide + hSide] = L.DomUtil.create('div', className, container);
        }

        createCorner('top', 'left');
        createCorner('top', 'right');
        createCorner('bottom', 'left');
        createCorner('bottom', 'right');

        createCorner('top', 'center');
        createCorner('middle', 'center');
        createCorner('middle', 'left');
        createCorner('middle', 'right');
        createCorner('bottom', 'center');
    }
});

const theLegend = L.control({
    position: 'topcenter'
});

theLegend.onAdd = function(map) {
    var div = L.DomUtil.create('div', 'info legend');
    div.style.width = '320px';
    div.style.height = 'auto';
    div.style.padding = '5px'; 
    div.style.fontSize = '13px'; 
    div.innerHTML += '<b>DMI WAM model | Significant Wave Height (m)</b> <br><b>Valid time:</b><br><span id="time-info">...</span>';

    return div;
};


// Baltic Sea coordinates (approximate center)
const balticSeaCoordinates = [61.0, 12.0];
const zoomLevel = 5;

// Initialize the map
const map = L.map('map', {
    minZoom: 4
}).setView(balticSeaCoordinates, zoomLevel);

theLegend.addTo(map);

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: ' OpenStreetMap contributors'
}).addTo(map);

const styleFunction = (features) => {
    const { properties } = features;
    const { swh_height_min } = properties;
    return getStyle(swh_height_min);
};

const options = {
    // Specify zoom range in which tiles are loaded. Tiles will be
    // rendered from the same data for Zoom levels outside the range.
    minDetailZoom: 4, // default undefined
    maxDetailZoom: 18, // default undefined
    // rendererFactory: L.canvas.tile,

    // Styling options for L.Polyline or L.Polygon. If it is a function, it
    // will be passed the vector-tile feature and the layer name as
    // parameters.
    style: styleFunction, // default undefined

    // This works like the same option for `Leaflet.VectorGrid`.
    // vectorTileLayerStyle, // default undefined
};

const baseUrl = process.env.MVT_URL;
const capabilitiesUrl = process.env.CAPABILITIES_URL;

function getColor(d) {
    if (d > 15) return '#000000';
    return colorPalette[d] || '#ffffff';
}

var legend = L.control({position: 'bottomright'});

legend.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'info legend'),
        legendIntervals = Object.keys(colorPalette).map(parseFloat).sort((a, b) => a - b),
        labels = [];

    // Add a title to the legend
    // div.innerHTML += '<h4>SWH (m)</h4>';
    div.innerHTML += '';

    // loop through our density intervals and generate a label with a colored square for each interval
    for (var i = 0; i < legendIntervals.length; i++) {
        div.innerHTML +=
            '<i style="background:' + getColor(legendIntervals[i]) + '"></i> ' +
            legendIntervals[i] + (legendIntervals[i + 1] ? '&ndash;' + legendIntervals[i + 1] + '<br>' : '+');
    }

    return div;
};

legend.addTo(map);

async function fetchAvailableDates() {
    try {
        const response = await axios.get(`${capabilitiesUrl}`);
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(response.data, 'text/xml');
        const dimensionElements = xmlDoc.getElementsByTagName('Dimension');
        const timeDimension = Array.from(dimensionElements).find(el => el.getAttribute('name') === 'time');

        if (timeDimension) {
            const timeValues = timeDimension.textContent.trim().split(',');
            return timeValues;
        }
    } catch (error) {
        console.error('Error fetching GetCapabilities:', error);
    }
    return [];
}

fetchAvailableDates().then(timeValues => {
    if (timeValues.length > 0) {
        // console.log('Available time values:', timeValues);
        const currentTime = new Date();
        const currentUtcTime = new Date(Date.UTC(currentTime.getUTCFullYear(), currentTime.getUTCMonth(), currentTime.getUTCDate(), currentTime.getUTCHours()));

        const reversedTimeValues = [...timeValues].reverse();
        const lastFullHour = reversedTimeValues.find(time => new Date(time) <= currentUtcTime);
        const initialTime = lastFullHour || timeValues[timeValues.length - 1];

        const utcFormatter = new Intl.DateTimeFormat('en-GB', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZone: 'UTC',
            timeZoneName: 'short'
        });

        const localFormatter = new Intl.DateTimeFormat('en-GB', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'short'
        });

        const formattedInitialUtcTime = utcFormatter.format(new Date(initialTime));
        const formattedInitialLocalTime = localFormatter.format(new Date(initialTime));
        document.getElementById('time-info').innerText = `${formattedInitialUtcTime} | ${formattedInitialLocalTime}`;

        // console.log('Initial time set to:', initialTime);
        const mvt_url = `${baseUrl}/swh_contours_datetime/{z}/{x}/{y}?datetime=${initialTime}`;
        let currentLayer = vectorTileLayer(mvt_url, options);
        currentLayer.addTo(map);

        currentLayer.on('click', (e) => {
            const { properties } = e.layer.feature;
            console.log('Feature properties:', properties);
        });

        const timeDimension = new L.timeDimension({
            times: timeValues,
            currentTime: initialTime
        });

        const updateLayerTime = (newTime) => {
            const updatedUrl = `${baseUrl}/swh_contours_datetime/{z}/{x}/{y}?datetime=${newTime}`;
            if (currentLayer) {
                map.removeLayer(currentLayer);
            }
            currentLayer = vectorTileLayer(updatedUrl, options);
            currentLayer.addTo(map);
            currentLayer.on('click', (e) => {
                const { properties } = e.layer.feature;
                // console.log('Feature properties:', properties);
            });
        };

        const throttleFunc = throttle(
            400,
            (event) => {
                const newTime = event.time;
                updateLayerTime(newTime);
                const utcFormatter = new Intl.DateTimeFormat('en-GB', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZone: 'UTC',
                    timeZoneName: 'short'
                });

                const localFormatter = new Intl.DateTimeFormat('en-GB', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZoneName: 'short'
                });

                const formattedUtcTime = utcFormatter.format(new Date(newTime));
                const formattedLocalTime = localFormatter.format(new Date(newTime));

                document.getElementById('time-info').innerText = `${formattedUtcTime} | ${formattedLocalTime}`;
            },
            { noLeading: false, noTrailing: false }
        );

        timeDimension.on('timeload', throttleFunc);

        const timeDimensionControl = new L.Control.TimeDimension({
            timeDimension: timeDimension,
            speedSlider: false,
            playButton: false,
            position: 'bottomcenter',
            autoPlay: false,
            loopButton: false,
            timeSliderDragUpdate: true
        });
        map.addControl(timeDimensionControl);
    }
});