var express = require('express');
const axios = require('axios');
const alphaVantageAPI = require('../utils/alphaVantageAPI');
const finnHubAPI = require('../utils/finnHubAPI');
const { query } = require('express');
var router = express.Router();

// Get Stock Search Results
router.get('/', async (req, res, next) => {
  try {
    let result;
    if (req.query["isMulti"] === "true") {
      result = await multiStockTickerSearch(req, res);
    } else {
      result = await standardStockSearch(req, res);
    }
    res.status(200).send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
});

// Handle isMulti = true (multi stock search)
async function multiStockTickerSearch(req, res) {
  console.log("multiStockTickerSearch");

  let tickersArray = req.query["tickers"].split(",");

  let alphaVantageResult = {};

  let processedResult;
  for (let index = 0; index < tickersArray.length; index++) {
    const ticker = tickersArray[index];
    let avResData;
    if (index == 0) {
      avResData = await getAlphaVantageMentionedStocks(req, res, alphaVantageAPI.createAlphaVantageOptionsTickerAndTopics(ticker, req.query["topics"]));
      // Init transform data structure
      processedResult = transformAlphaVantageRes(req, avResData, ticker, null);
    } else {
      avResData = await getAlphaVantageMentionedStocks(req, res, alphaVantageAPI.createAlphaVantageOptionsTickerAndTopics(ticker, req.query["topics"]));
      // Transform previous iteration's results
      processedResult = transformAlphaVantageRes(req, avResData, ticker, alphaVantageResult);
    }

    if (index == 0) {
      // Initialise output DS
      alphaVantageResult = processedResult;
    } else {
      // Concatenate processed results to output DS
      alphaVantageResult["tickerFeed"] = alphaVantageResult["tickerFeed"].concat(processedResult["tickerFeed"]);
    }
  }
  // Get extended news results
  let finnHubNewsResult = await getFinnHubCompanyNewsConcurrent(req, res, finnHubAPI.createFinnHubCompanyNewsOptions(), alphaVantageResult);
  // Get social sentiment results
  let finnHubSocialSentimentsResults = await getFinnHubSocialSentimentsConcurrent(req, res, finnHubAPI.createFinnHubSocialSentimentsOptions(), finnHubNewsResult);

  return finnHubSocialSentimentsResults;
}

// Handle isMulti = false (standard stock search)
async function standardStockSearch(req, res) {
  console.log("standardStockSearch");
  // Get news and related stocks results
  let alphaVantageResult = await getAlphaVantageMentionedStocks(req, res, alphaVantageAPI.createAlphaVantageOptionsQuery(req.query));
  // Transform data structure
  let processedResult = transformAlphaVantageRes(req, alphaVantageResult, null, null);
  // Get extended news results
  let finnHubNewsResult = await getFinnHubCompanyNewsConcurrent(req, res, finnHubAPI.createFinnHubCompanyNewsOptions(), processedResult);
  // Get social sentiment results
  let finnHubSocialSentimentsResults = await getFinnHubSocialSentimentsConcurrent(req, res, finnHubAPI.createFinnHubSocialSentimentsOptions(), finnHubNewsResult);
  return finnHubSocialSentimentsResults;
}

async function getAlphaVantageMentionedStocks(req, res, options) {
  const url = `https://${options.hostname}${options.path}`;
  // console.log(url);

  const response = await axios.get(url);

  return response.data;
}

function transformAlphaVantageRes(req, avResData, aMultiQuerySplitTicker, prevJSON) {
  let tickerFeed = [];

  // Handle isMulti = false
  if (req.query["tickers"] && aMultiQuerySplitTicker === null) {
    let queryTickersArray = req.query["tickers"].split(",");
    queryTickersArray.forEach(ticker => {
      tickerFeed.push({ ticker, articles: [] });
    });
  }
  // Handle isMulti = true
  else if (aMultiQuerySplitTicker !== null) {
    tickerFeed.push({ ticker: aMultiQuerySplitTicker, articles: [] });
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

      // Got enough results
      if (currentResultsFound >= numberOfResultsLimit)
        break articleLoop;

      // Prevent duplicated related stock tickers in current iteration
      if (tickerFeed.some(t => t.ticker === relatedTicker)) {
        continue tickerLoop;
      }
      // Prevent CRYPTO:... FOREX:...
      if (relatedTicker.includes(":"))
        continue tickerLoop;
      // Prevent query tickers in related stock tickers
      if ((req.query["tickers"] !== undefined && req.query["tickers"].includes(relatedTicker)))
        continue tickerLoop;
      // Prevent duplicated related stock tickers in previous iteration
      if ((prevJSON && prevJSON.tickerFeed && prevJSON.tickerFeed.some(t => t.ticker === relatedTicker)))
        continue tickerLoop;

      // Prepare DS
      tickerFeed.push({
        ticker: relatedTicker,
        articles: [
          {
            title: avArticle.title,
            summary: avArticle.summary,
            url: avArticle.url,
            image: avArticle.banner_image,
            source: avArticle.source,
            dateTimePublished: alphaVantageAPI.alphaVantageDateToISOString(avArticle.time_published),
            topics: avArticle.topics,
            related: (aMultiQuerySplitTicker !== null ? aMultiQuerySplitTicker : query.tickers)
          },
        ]
      });
      currentResultsFound++;
    }
  }
  // Append DS
  let alphaVantageResultObj = {
    queryTickers: req.query["tickers"],
    queryTopics: req.query["topics"],
    tickerFeed
  }
  return alphaVantageResultObj;
}

async function getFinnHubCompanyNewsConcurrent(req, res, options, prevJSON) {
  let urlArray = [];
  let queryTickerArray = [];
  // Init external endpoint urls
  for (let index = 0; index < prevJSON.tickerFeed.length; index++) {
    let url = `https://${options.hostname}${options.path}`;
    const queryTicker = prevJSON.tickerFeed[index].ticker;
    url += ("&symbol=" + queryTicker);
    // console.log(url);
    urlArray.push(url);
    queryTickerArray.push(queryTicker);
  }

  // Concurrent GET requests
  const responseArray = await Promise.all(urlArray.map(url => axios.get(url)));

  for (let i = 0; i < responseArray.length; i++) {
    let responseData = responseArray[i].data;
    let currentResultsFound = 0;
    const numberOfResultsLimit = 3;
    for (let j = 0; j < responseData.length; j++) {
      const fhArticle = responseData[j];
      // Got enough results
      if (currentResultsFound >= numberOfResultsLimit)
        break;

      // Find Ticker Object to update
      let tickerObject = prevJSON.tickerFeed.find(stock => {
        return stock["ticker"] === queryTickerArray[i];
      })

      // Prevent articles with duplicate stock ticker
      if (tickerObject.articles.some(article => article.ticker === queryTickerArray[j])) {
        continue;
      }

      // Push DS
      tickerObject.articles.push({
        title: fhArticle.headline,
        summary: fhArticle.summary,
        url: fhArticle.url,
        image: fhArticle.image,
        source: fhArticle.source,
        dateTimePublished: finnHubAPI.finnhubDateToISOString(fhArticle.datetime),
        related: fhArticle.related
      });
      currentResultsFound++;
    }
  }
  return prevJSON;
}

async function getFinnHubSocialSentimentsConcurrent(req, res, options, prevJSON) {
  let urlArray = [];
  let queryTickerArray = [];
  // Init external endpoint urls
  for (let i = 0; i < prevJSON.tickerFeed.length; i++) {
    let url = `https://${options.hostname}${options.path}`;
    const queryTicker = prevJSON.tickerFeed[i].ticker;
    url += ("&symbol=" + queryTicker);
    // console.log(url);
    urlArray.push(url);
    queryTickerArray.push(queryTicker);
  }
  // Concurrent GET requests
  const responseArray = await Promise.all(urlArray.map(url => axios.get(url)));

  for (let i = 0; i < responseArray.length; i++) {
    let responseData = responseArray[i].data;
    // Find Ticker Object to update
    let tickerObject = prevJSON.tickerFeed.find(stock => {
      return stock["ticker"] === queryTickerArray[i];
    })

    let redditSentimentObj = null;
    let twitterSentimentObj = null;
    if (responseData.reddit.length > 0) {
      redditSentimentObj = finnHubAPI.aggregateYearlySentiment(responseData, redditSentimentObj, "reddit");
    }
    if (responseData.twitter.length > 0) {
      twitterSentimentObj = finnHubAPI.aggregateYearlySentiment(responseData, twitterSentimentObj, "twitter");
    }
    // Append DS
    tickerObject["sentiment"] = {
      reddit: redditSentimentObj,
      twitter: twitterSentimentObj,
    }
  }
  return prevJSON;
}

module.exports = router;
