const fs = require('fs');
const path = require('path');
const csv = require('fast-csv');

// global data array
const countryData = [];

fs.createReadStream(path.resolve(__dirname, 'covid_quot_pays_modif.csv'))
    .pipe(csv.parse({ headers: true }))
    .on('error', error => console.error(error))
    .on('data', row => getCSVData(row))
    .on('end', rowCount => onEnd(rowCount));


const getCSVData = (rowData) => {
    countryData.push(rowData.frenchCountry);
};

const onEnd = (rowCount) => {
    const rmDupplicate = new Set(countryData);
    console.log(rmDupplicate);
    console.log(`Parsed ${rowCount} rows`);
}
