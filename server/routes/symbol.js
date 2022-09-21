const { default: axios } = require('axios');
const { query } = require('express');
var express = require('express');
const { param } = require('.');
var router = express.Router();

/* GET home page. */
router.get('/', async function (req, res, next) {
    try {
        let result = await getStockSymbols(req);
        res.status(200).send(result);
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
});

async function getStockSymbols(req) {
    const options = createStockSymbolOptions();
    const url = `https://${options.hostname}${options.path}`;
    // console.log(url);
    let response = await axios.get(url);
    return response.data;
}

function createStockSymbolOptions() {
    const options = {
        hostname: 'tradestie.com',
        path: '/api/v1/apps/reddit',
    }

    return options;
}

module.exports = router;
