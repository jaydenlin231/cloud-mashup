require('dotenv').config();

const apiKey = process.env.FINNHUB_API_KEY;
function getCurrentDate() {
    let currentDate = new Date();
    const offset = currentDate.getTimezoneOffset();
    currentDate = new Date(currentDate.getTime() - (offset * 60 * 1000));
    return currentDate.toISOString().split('T')[0];
}

function getYearAgoDate() {
    let yearAgoDate = new Date();
    yearAgoDate.setFullYear(yearAgoDate.getFullYear() - 1);
    const offset = yearAgoDate.getTimezoneOffset();
    yearAgoDate = new Date(yearAgoDate.getTime() - (offset * 60 * 1000));
    return yearAgoDate.toISOString().split('T')[0];
}

module.exports = {
    finnhubDateToISOString: function (finnhubDateEpochSec) {
        let date = new Date(0);
        date.setUTCSeconds(finnhubDateEpochSec);
        return date.toISOString();
    },
    createFinnHubCompanyNewsOptions: function () {
        const options = {
            hostname: 'finnhub.io',
            path: '/api/v1/company-news?',
        }

        let str = "&from=" + getYearAgoDate() +
            "&to=" + getCurrentDate() +
            "&token=" + process.env.FINNHUB_API_KEY;

        options.path += str;
        return options;
    },
    aggregateYearlySentiment: function (fhResData, outputSentimentObj, socialMediaString) {
        outputSentimentObj = {
            atTime: new Date().toISOString(),
            mention: 0,
            positiveMention: 0,
            negativeMention: 0,
            positiveScore: 0,
            negativeScore: 0,
            score: 0
        };
        let numberOfSamples = fhResData[`${socialMediaString}`].length;
        fhResData[`${socialMediaString}`].forEach(sentAnalysisObj => {
            outputSentimentObj.mention += sentAnalysisObj["mention"];
            outputSentimentObj.positiveMention += sentAnalysisObj["positiveMention"];
            outputSentimentObj.negativeMention += sentAnalysisObj["negativeMention"];
            outputSentimentObj.positiveScore += sentAnalysisObj["positiveScore"];
            outputSentimentObj.negativeScore += sentAnalysisObj["negativeScore"];
            outputSentimentObj.score += sentAnalysisObj["score"];
        });
        outputSentimentObj.positiveScore /= numberOfSamples;
        outputSentimentObj.negativeScore /= numberOfSamples;
        outputSentimentObj.score /= numberOfSamples;
        return outputSentimentObj;
    },
    createFinnHubSocialSentimentsOptions: function () {
        const options = {
            hostname: 'finnhub.io',
            path: '/api/v1/stock/social-sentiment?',
        }

        let str = "&from=" + getYearAgoDate() +
            "&to=" + getCurrentDate() +
            "&token=" + process.env.FINNHUB_API_KEY;

        options.path += str;
        return options;
    }
}