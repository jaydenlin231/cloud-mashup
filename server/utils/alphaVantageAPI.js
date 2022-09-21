require('dotenv').config();

const apiKey = process.env.ALPHAVANTAGE_API_KEY;
module.exports = {
    alphaVantageDateToISOString: function (alphaVantageDateString) {
        let builtISOString = (alphaVantageDateString.substring(0, 4)) + // YYYY
            "-" +
            (alphaVantageDateString.substring(4, 6)) + // MM
            "-" +
            (alphaVantageDateString.substring(6, 8)) + // DD
            "T" +
            (alphaVantageDateString.substring(9, 11)) + // HH
            ":" +
            (alphaVantageDateString.substring(11, 13)) + // mm
            ":" +
            (alphaVantageDateString.substring(13, 15)) + // ss
            ".000Z";

        return builtISOString;
    },
    createAlphaVantageOptionsQuery: function (query) {
        const options = {
            hostname: 'www.alphavantage.co',
            path: '/query?',
        }
        let str = 'function=' + "NEWS_SENTIMENT" + '&apikey=' + process.env.ALPHAVANTAGE_API_KEY;

        if (query['tickers'])
            str = str + '&tickers=' + query['tickers'];

        if (query['topics'])
            str = str + '&topics=' + query['topics'];

        options.path += str;
        return options;
    },
    createAlphaVantageOptionsTickerAndTopics: function (queryTickers, queryTopics) {
        const options = {
            hostname: 'www.alphavantage.co',
            path: '/query?',
        }
        let str = 'function=' + "NEWS_SENTIMENT" + '&apikey=' + process.env.ALPHAVANTAGE_API_KEY;

        if (queryTickers != null && queryTickers != "")
            str = str + '&tickers=' + queryTickers;

        if (queryTopics != null && queryTopics != "")
            str = str + '&topics=' + queryTopics;

        options.path += str;
        return options;
    }
}