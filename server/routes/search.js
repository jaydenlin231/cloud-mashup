var express = require('express');
const axios = require('axios');
const logger = require('morgan');
const { routes } = require('../app');
const { query } = require('express');
var router = express.Router();

/* GET users listing. */
// http://localhost:3000/search?tickers=AAPL&topic=technology
router.get('/', async (req, res, next) => {
  try {
    console.log("search2/");

    let alphaVantageResult = await getAlphaVantageMentionedStocks(req, res, createAlphaVantageOptionsQuery(req.query), null, null);
    let processedResult = transformAlphaVantageRes(req, alphaVantageResult, null, null);

    let finnHubNewsResult = await getFinnHubCompanyNews(req, res, createFinnHubCompanyNewsOptions(), processedResult);
    let finnHubSocialSentimentsResults = await getFinnHubSocialSentiments(req, res, createFinnHubSocialSentimentsOptions(), finnHubNewsResult);
    res.status(200).send(finnHubSocialSentimentsResults);
  } catch (error) {
    console.error(error);
  }
});

router.get('/multi', async (req, res, next) => {
  try {
    console.log("search2/multi");

    let tickersArray = req.query["tickers"].split(",");
    
    let alphaVantageResult = {};

    let processedResult;
    for (let index = 0; index < tickersArray.length; index++) {
      const ticker = tickersArray[index];
      let avResData;
      if (index == 0){
        avResData = await getAlphaVantageMentionedStocks(req, res, createAlphaVantageOptionsTicker(ticker));
        processedResult = transformAlphaVantageRes(req, avResData, ticker, null);
      } else {
        avResData = await getAlphaVantageMentionedStocks(req, res, createAlphaVantageOptionsTicker(ticker));
        processedResult = transformAlphaVantageRes(req, avResData, ticker, alphaVantageResult);
      }
      
      if(index == 0){
        alphaVantageResult = processedResult;
      } else {
        alphaVantageResult["articleFeed"] =  alphaVantageResult["articleFeed"].concat(processedResult["articleFeed"])
      }
    }
    let finnHubNewsResult = await getFinnHubCompanyNews(req, res, createFinnHubCompanyNewsOptions(), alphaVantageResult);
    let finnHubSocialSentimentsResults = await getFinnHubSocialSentiments(req, res, createFinnHubSocialSentimentsOptions(), finnHubNewsResult);

    res.status(200).send(finnHubSocialSentimentsResults);
  } catch (error) {
    console.error(error);
  }
});

async function getAlphaVantageMentionedStocks(req, res, options) {
  try {
    const url = `https://${options.hostname}${options.path}`;
    console.log(url);

    const response = await axios.get(url);
    
    return response.data;
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: error.message })
    return;
  }
}
async function getFinnHubCompanyNews(req, res, options, prevJSON) {
  try {
    for (let index = 0; index < prevJSON.articleFeed.length; index++) {
      let url = `https://${options.hostname}${options.path}`;
      const queryTicker = prevJSON.articleFeed[index].ticker;
      url += ("&symbol=" + queryTicker);
      console.log(url);
      const response = await axios.get(url);
      let currentResultsFound = 0;
      const numberOfResultsLimit = 3;

      for (let index = 0; index < response.data.length; index++) {
        const fhArticle = response.data[index];
        // console.log(newsArticle.url);
        if (currentResultsFound >= numberOfResultsLimit)
          break;
          
        let tickerArticleFeed = prevJSON.articleFeed.find(stock =>{
          return stock["ticker"] === queryTicker;
        })
        
        if (tickerArticleFeed.articles.some(article => article.ticker === queryTicker)){
          console.log(relatedTicker);
          continue;
        }
        
        tickerArticleFeed.articles.push({
          title: fhArticle.headline,
          summary: fhArticle.summary,
          url: fhArticle.url,
          image: fhArticle.image,
          source: fhArticle.source,
          dateTimePublished: finnhubDateToISOString(fhArticle.datetime),
          related: fhArticle.related
        });
        currentResultsFound++;
      }
    }
    return prevJSON;
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: error.message })
  }
}


async function getFinnHubSocialSentiments(req, res, options, prevJSON){
    try {
      for (let index = 0; index < prevJSON.articleFeed.length; index++) {
        let url = `https://${options.hostname}${options.path}`;
        const queryTicker = prevJSON.articleFeed[index].ticker;
        url += ("&symbol=" + queryTicker);
        console.log(url);
        const response = await axios.get(url);
        
        let tickerArticleFeed = prevJSON.articleFeed.find(stock =>{
          return stock["ticker"] === queryTicker;
        })

        let dailyRedditSentimentObj;
        let dailyTwitterSentimentObj;
        if(response.data.reddit.length > 0){
          dailyRedditSentimentObj = getDailySentiment(response.data, dailyRedditSentimentObj, "reddit");
        }
        if(response.data.twitter.length > 0){
          dailyTwitterSentimentObj = getDailySentiment(response.data, dailyTwitterSentimentObj, "twitter");
        }

        tickerArticleFeed["sentiment"]= {
          reddit: dailyRedditSentimentObj,
          twitter: dailyTwitterSentimentObj,
        }
      }
      return prevJSON;
    } catch (error) {
      console.error(error);
      res.status(500).send({ error: error.message })
    }
}

const alphaVantageAPI = {
  apikey: "0OG8A2RYBXBYEOHV",
  datatype: "json",
};

const finnHubAPI = {
  apikey: "cceud7qad3ifd4q5uqgg",
  datatype: "json",
};

function getDailySentiment(fbResData, outputSentimentObj, socialMediaString) {
  outputSentimentObj = {
    atTime: new Date().toISOString(),
    mention: 0,
    positiveMention: 0,
    negativeMention: 0,
    positiveScore: 0,
    negativeScore: 0,
    score: 0
  };
  let numberOfSamples = fbResData[`${socialMediaString}`].length;
  fbResData[`${socialMediaString}`].forEach(sentAnalysisObj => {
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
}

function createAlphaVantageOptionsQuery(query) {
  const options = {
    hostname: 'www.alphavantage.co',
    path: '/query?',
  }
  let str = 'function=' + "NEWS_SENTIMENT" + '&apikey=' + alphaVantageAPI.apikey;

  if (query['tickers'])
    str = str + '&tickers=' + query['tickers'];

  if (query['topics'])
    str = str + '&topics=' + query['topics'];

  options.path += str;
  return options;
}

function createAlphaVantageOptionsTicker(queryTickers) {
  const options = {
    hostname: 'www.alphavantage.co',
    path: '/query?',
  }
  let str = 'function=' + "NEWS_SENTIMENT" + '&tickers=' + queryTickers + '&apikey=' + alphaVantageAPI.apikey;

  options.path += str;
  return options;
}

function createFinnHubCompanyNewsOptions() {
  // https://finnhub.io/api/v1/company-news?symbol=TSLA&from=2022-01-01&to=2022-12-31&token=cceud7qad3ifd4q5uqgg
  const options = {
    hostname: 'finnhub.io',
    path: '/api/v1/company-news?',
  }

  let str = "&from=" + getYearAgoDate() +
    "&to=" + getCurrentDate() +
    "&token=" + finnHubAPI.apikey;

  options.path += str;
  return options;
}
function createFinnHubSocialSentimentsOptions() {
  // /stock/social-sentiment?symbol=GME
  const options = {
    hostname: 'finnhub.io',
    path: '/api/v1/stock/social-sentiment?',
  }

  let str = "&token=" + finnHubAPI.apikey;

  options.path += str;
  return options;
}

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
// new Date()
// to
// 2022-09-12T08:37:41.974Z
// to
// 20220912T022615
function jsDateToAlphaVantageDate(aDate) {
  return aDate.toISOString().split(".")[0].replaceAll("-", "").replaceAll(":", "");
}

// 20220912T083942
// to
// YYYY-MM-DDTHH:mm:ss.sssZ
// 
// Js Date()
function alphaVantageDateToJSDate(alphaVantageDateString) {
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

  let date = new Date(0);
  date.setUTCMilliseconds(Date.parse(builtISOString));
  return date;
}

function alphaVantageDateToISOString(alphaVantageDateString) {
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
}

function finnhubDateToISOString(finnhubDateEpochSec){
  let date = new Date(0);
  date.setUTCSeconds(finnhubDateEpochSec);
  return date.toISOString();
}

function transformAlphaVantageRes(req, avResData, aMultiQuerySplitTicker, prevJSON) {
  let articleFeed = [];

  // Handle /search 
  if(req.query["tickers"] && aMultiQuerySplitTicker === null){
    let queryTickersArray = req.query["tickers"].split(",");
    queryTickersArray.forEach(ticker => {
      articleFeed.push({ticker, articles: []});
    });
  }
  // Handle /search/multi  
  else if (aMultiQuerySplitTicker !== null) {
    articleFeed.push({ticker: aMultiQuerySplitTicker, articles: []});
  }
  
  let currentResultsFound = 0;
  const numberOfResultsLimit = 3;

  articleLoop:
  for (let i = 0; i < avResData.items; i++) {
    const avArticle = avResData.feed[i];

    tickerLoop:
    for (let j = 0; j < avArticle.ticker_sentiment.length; j++) {
      let relatedTickerObj = avArticle.ticker_sentiment[j];
      let relatedTicker = relatedTickerObj.ticker;

      if (currentResultsFound >= numberOfResultsLimit)
        break articleLoop;

      if (articleFeed.some(t => t.ticker === relatedTicker)){
        continue tickerLoop;
      } 
      if (relatedTicker.includes(":"))
        continue tickerLoop;
      if ((req.query["tickers"] !== undefined && req.query["tickers"].includes(relatedTicker)))
        continue tickerLoop;
      if ((prevJSON && prevJSON.articleFeed &&prevJSON.articleFeed.some(t => t.ticker === relatedTicker)))
        continue tickerLoop;

      articleFeed.push({
        ticker: relatedTicker,
        articles: [
          {
            title: avArticle.title,
            summary: avArticle.summary,
            url: avArticle.url,
            image: avArticle.banner_image,
            source: avArticle.source,
            dateTimePublished: alphaVantageDateToISOString(avArticle.time_published),
            topics: avArticle.topics,
            related: (aMultiQuerySplitTicker !== null ? aMultiQuerySplitTicker : query.tickers)
          },
        ]
      });
      currentResultsFound++;
    }
  }
  let alphaVantageResultObj = {
    queryTickers: req.query["tickers"],
    queryTopics: req.query["topics"],
    articleFeed
  }
  return alphaVantageResultObj;
}

module.exports = router;
