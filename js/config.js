export const mapboxgl_access_token = 'pk.eyJ1IjoiYXJrYmFyY2xheSIsImEiOiJjamdxeDF3ZXMzN2IyMnFyd3EwdGcwMDVxIn0.P2bkpp8HGNeY3-FOsxXVvA';

// API url
export const url = [
  './data/',
  '.csv'
];

export const api = 'https://pmd3-production-drafter-onsgeo.publishmydata.com/v1/sparql/live?query=';

// Colors and options
export const colors = [
  'rgb(43, 175, 219)',
  'rgb(234, 56, 179)',
  'rgb(43, 225, 179)',
  'rgb(232, 241, 47)',
  'rgb(247, 93, 43)'
];

export const options = [
  {niceName: 'Ethnicity', varName: 'ethnicity'},
  {niceName: 'Social grade', varName: 'class'},
  {niceName: 'Hours worked', varName: 'hours'},
  {niceName: 'Housing type', varName: 'home'},
  {niceName: 'Housing tenure', varName: 'tenure'}
];

export const unitise = {
  'ethnicity': 'people',
  'class': 'people',
  'hours': 'workers',
  'home': 'homes',
  'tenure': 'homes'
};

export const mapConfig = {
  style: './data/style-omt.json',
  center: [-1.2471735, 50.8625412],
  zoom: 12,
  maxZoom: 14,
  minZoom: 8
}
