import * as config from './config.js';
import { tsv2json, json2geo } from './utils.js';
import { populatePopup } from './ui-utils.js';

// DOM elements
const spinner = document.getElementById('loader');
const selector = document.getElementById('selector');
const legend = document.getElementById('legend');
const units = document.getElementById('units');
const count = document.getElementById('count');
// TODO: un-comment postcode search
//const form = document.getElementById('form');
const postcode = document.getElementById('postcode');

// Set null variables
var data = {
  'headers': [],
  'values': {},
  'totals': [],
  'perc': [],
};
// TODO: possibly re-add feature that caches data using `store` variable

// Create popup class for map tooltips
var popup = new mapboxgl.Popup({
  closeButton: false,
  closeOnClick: false
});

function showData(data, dim) {
  genLegend(data);
  clearDots();
  updateDots();
  units.innerHTML = config.unitise[dim];
  spinner.style.display = 'none';
}

// Function to get data
function getData(dim) {
  spinner.style.display = 'flex';
  let dataurl = config.url[0] + dim + config.url[1];
  fetch(dataurl)
    .then((response) => {
      return response.text();
    })
    .then((tsvdata) => {
      data = tsv2json(tsvdata);
      showData(data, dim);
    });
}

// Function to get color for a value based on breaks
function getColor(value, breaks) {
  for (let i=0; i<breaks.length; i++) {
    if (value < breaks[i]) {
      if (document.getElementById('legend' + i).checked) {
        return [config.colors[i], i];
      } else {
        return [null, i];
      }
    }
  }
  return [null, null];
}

// Function to add layers to map
function makeLayers() {

  // Variable for highlighting areas
  let hoveredId = null;

  // Add boundaries tileset
  map.addSource('dots', {
    "type": 'vector',
    "tiles": ['https://cdn.ons.gov.uk/maptiles/administrative/oa/v1/dots/{z}/{x}/{y}.pbf'],
    "promoteId": { "dots": "id" },
    "buffer": 0,
    "maxzoom": 13,
    "minzoom": 8
  });

  map.addSource('bounds', {
    "type": "vector",
    "promoteId": { "OA_bound_ethnicity": "oa11cd" },
    "tiles": ["https://cdn.ons.gov.uk/maptiles/t9/{z}/{x}/{y}.pbf"],
    "minzoom": 11,
    "maxzoom": 14
  });

  // Add layer from the vector tile source with data-driven style
  map.addLayer({
    id: 'dots-join',
    type: 'circle',
    source: 'dots',
    'source-layer': 'dots',
    paint: {
      'circle-color':
        ['case',
          ['!=', ['feature-state', 'color'], null],
          ['feature-state', 'color'],
          'rgba(0, 0, 0, 0)'
        ],
      'circle-radius':
        ['interpolate', ['linear'], ['zoom'], 8, 1, 12, 1.5, 14, 2],
      'circle-opacity': 1
    }
  }, 'boundary_country');

  map.addLayer({
    id: 'bounds',
    type: 'fill',
    source: 'bounds',
    'source-layer': 'OA_bound_ethnicity',
    "paint": {
      "fill-outline-color": "#ffffff",
      "fill-color": "#ffffff",
      "fill-opacity": 0
    }
  }, 'boundary_country');

  map.addLayer({
    id: 'boundslines',
    type: 'line',
    source: 'bounds',
    'source-layer': 'OA_bound_ethnicity',
    "paint": {
      "line-opacity": [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        1,
        0
      ],
      "line-color": "rgb(255, 255, 255)",
      "line-width": 1
    }
  }, 'boundary_country');

  // Show data on hover
  map.on('mousemove', 'bounds', function (e) {
    if (e.features.length > 0) {
      if (hoveredId) {
        map.setFeatureState(
          { source: 'bounds', sourceLayer: 'OA_bound_ethnicity', id: hoveredId },
          { hover: false }
        );
      }
      hoveredId = e.features[0].id;
      map.setFeatureState(
        { source: 'bounds', sourceLayer: 'OA_bound_ethnicity', id: hoveredId },
        { hover: true }
      );

      populatePopup(popup, data, hoveredId, config, e.lngLat, map);
    }
  });

  // Remove tooltips on mouseleave
  map.on('mouseleave', 'bounds', function () {
    if (hoveredId) {
      map.setFeatureState(
        { source: 'bounds', sourceLayer: 'OA_bound_ethnicity', id: hoveredId },
        { hover: false }
      );
    }
    hoveredId = null;

    popup.remove();
  });

  // Update legend on zoom
  map.on('zoom', function () {
    updateUnits();
  });
}

// Function to set properties of map features
function setProperties(dots) {
  console.log(data.values.E00000001);
  for (let dot of dots) {
    let code = dot.substring(0, 9);
    let num = +dot.substring(9);
    let color = getColor(num, data.values[code].breaks);

    map.setFeatureState({
      source: 'dots',
      sourceLayer: 'dots',
      id: dot
    }, {
      color: color[0],
      group: color[1]
    });
  }
  if (map.isSourceLoaded('centroids')) {
    updateLegend();
  }
}

// Function to check if new dots have been loaded
function updateDots() {
  if (data.totals[0]) {
    let features = map.querySourceFeatures('dots', { 'sourceLayer': 'dots' });
    let newdots = [];
    for (let feature of features) {
      let id = feature.properties.id;
      let state = map.getFeatureState({
        source: 'dots',
        sourceLayer: 'dots',
        id: id
      });
      if (!state['color']) {
        newdots.push(id);
      }
    }
    setProperties(newdots);
  }
}

function updateLegend() {
  // Initialise counts for each group
  let counts = new Array(data.headers.length).fill(0);

  // Add add group counts for each visible feature
  let features = map.queryRenderedFeatures({ layers: ['centroids'] });
  let ids = features.map(feature => feature.id);
  // ids = ids.filter((v, i, a) => a.indexOf(v) === i);
  for (let id of ids) {
    let values = data.values[id].counts;
    for (let i=0; i<values.length; i++) {
      counts[i] += values[i];
    }
  }

  // Turn counts into percentages + render to DOM
  let sum = counts.reduce((a, b) => a + b);
  let perc = counts.map((num) => Math.round((num / sum) * 100));
  for (let i=0; i<perc.length; i++) {
    document.getElementById('perc' + i).innerHTML = perc[i] + '%';
  }
}

// Function to generate options + set event listener
function genOptions(options) {
  let html = ""
  options.forEach(function(d, i) {
    let selected = i == 0 ? ' selected="selected"' : "";
    html += '<option value="' + d.varName + '"' + selected + '>' + d.niceName + '</option>';
  });
  selector.innerHTML = html;
  selector.onchange = () => { getData(selector.value); }
}

// Function to clear map dots styling
function clearDots() {
  map.removeFeatureState({
    source: 'dots',
    sourceLayer: 'dots'
  });
}

// Function to add legend scale
function genLegend(data) {
  let html = '';
  for (let i=0; i<data.headers.length; i++) {
    html += '<p class="mb-1"><span class="dot mr-1" style="background-color:' + config.colors[i] + ';"></span><input type="checkbox" id="legend' + i + '" checked /> <small>' + data.headers[i] + ' <span id="perc' + i + '"></span> <span class="text-secondary">(' + data.perc[i] + '%)</span></small></p>';
  }
  legend.innerHTML = html;
  for (let i=0; i<data.headers.length; i++) {
    let element = document.getElementById('legend' + i);
    element.onclick = () => {
      clearDots();
      updateDots();
    };
  }
}

// Function to load OA centroids (for calculating averages in view)
function loadCentroids() {
  fetch(config.url[0] + 'oalatlng' + config.url[1])
  .then(response => response.text())
  .then(rawdata => {
    let geojson = json2geo(d3.csvParse(rawdata));
    console.log(geojson);
    map.addSource('centroids', {
      "type": "geojson",
      "data": geojson,
      "promoteId": "code"
    });
    map.addLayer({
      id: 'centroids',
      type: 'circle',
      source: 'centroids',
      paint: {
        'circle-opacity': 0,
        'circle-radius': 0
      }
    });
  })
}

// Function to display units based on zoom
function updateUnits() {
  let zoom = map.getZoom();
  let unit = zoom >= 13 ? 10 : zoom >= 12 ? 20 : zoom >= 11 ? 40 : zoom >= 10 ? 80 : zoom >= 9 ? 160 : 320;
  count.innerHTML = unit;
}

//// Function to get a postcode lng/lat from COGS
//function gotoPostcode(e) {
//  let code = postcode.value.replace(new RegExp(' ', 'g'), '').toUpperCase();
//  let query = `SELECT ?lat ?lng
//  WHERE {
//    <http://statistics.data.gov.uk/id/postcode/unit/${code}> <http://www.w3.org/2003/01/geo/wgs84_pos#lat> ?lat ;
//    <http://www.w3.org/2003/01/geo/wgs84_pos#long> ?lng .
//  }
//  LIMIT 1`;
//  fetch(config.api + encodeURIComponent(query))
//    .then(response => response.text())
//    .then(rawdata => d3.csvParse(rawdata))
//    .then(data => {
//      if (data[0]) {
//        map.flyTo({
//          center: [data[0].lng, data[0].lat],
//          zoom: 14
//        });
//      } else {
//        postcode.value = null;
//        postcode.placeholder = "Not found. Type a postcode...";
//      }
//    });
//  e.preventDefault();
//}

// INITIALISE MAP
mapboxgl.accessToken = config.mapboxgl_access_token;
var map = new mapboxgl.Map({ container: 'map', ...config.mapConfig });

// ADD LAYERS + DATA ONCE MAP IS INITIALISED
map.on('load', function () {
  genOptions(config.options);
  makeLayers();
  updateUnits();
  loadCentroids();
  getData(selector.value);
});

// Set up an event listener on the map.
map.on('sourcedata', function (e) {
  if (map.areTilesLoaded()) {
    updateDots();
  }
});

//// Set event listener on postcode search
//form.addEventListener('submit', gotoPostcode);
