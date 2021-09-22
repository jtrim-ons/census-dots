// Populate the popup and set its coordinates
// based on the feature found.
export function populatePopup(popup, data, hoveredId, config, lngLat, map) {
  let text = '<strong>Output area ' + hoveredId + '</strong>';
  data.headers.forEach(function(header, i) {
    text += '<br><span class="dot mr-1" style="background-color:' + config.colors[i] + ';"></span>' + header + ': ' + data.values[hoveredId].counts[i];
  });

  popup
    .setLngLat(lngLat)
    .setHTML(text)
    .addTo(map);
}
