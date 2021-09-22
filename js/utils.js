// Function to turn CSV (string) into array of objects
export function tsv2json(string) {
  let json = {
    'headers': [],
    'values': {},
    'totals': [],
    'perc': [],
  };
  string = string.replace(/['"]+/g, '');
  let array = string.split('\n');
  let headers = array[0].split(',');
  headers.shift();
  json.headers = headers;
  for (let i in headers) {
    json.totals.push(0);
  }
  for (var i = 1; i < array.length; i++) {
    let row = array[i].split(',');
    if (row[1]) {
      let tot = 0;
      let counts = [];
      let breaks = [];
      for (let j = 1; j < row.length; j++) {
        let val = +row[j];
        tot += Math.round(val / 10);
        counts.push(val);
        breaks.push(tot);
        json.totals[j - 1] += val;
      }
      json.values[row[0]] = {
        'counts': counts,
        'breaks': breaks
      }
    }
  }
  let sum = 0;
  for (let tot in json.totals) {
    sum += json.totals[tot];
  }
  for (let tot in json.totals) {
    let perc = Math.round(100 * (json.totals[tot] / sum));
    json.perc.push(perc);
  }
  return json;
}

// Function to convert JSON to GeoJSON
export function json2geo(json) {
  let geojson = {
    "type": "FeatureCollection",
    "features": []
  };
  for (let i in json) {
    let feature = {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [+json[i].lng, +json[i].lat]
      },
      "properties": {
        "code": json[i].code
      }
    };
    geojson.features.push(feature);
  }
  return geojson;
}

