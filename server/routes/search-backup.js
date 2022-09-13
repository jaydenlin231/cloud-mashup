var express = require('express');
const axios = require('axios');
const logger = require('morgan');
const { routes } = require('../app');
const { query } = require('express');
var router = express.Router();

/* GET users listing. */
// http://localhost:3000/search?tickers=AAPL&topic=technology
router.get('/', async (req, res, next) => {
  console.log("search/");
  try {
    let alphaVantageResult = await getAlphaVantageMentionedStocks(req, res, createAlphaVantageOptionsQuery(req.query), null, null);
    let finnHubbResult = await getFinHubbCompanyNews(req, res, createFinnHubOptions(), alphaVantageResult);
    res.status(200).send(alphaVantageResult);
  } catch (error) {
    console.error(error);
  }
});

router.get('/multi', async (req, res, next) => {
  console.log("search/multi");
  try {
    let tickersArray = req.query["tickers"].split(",");
    
    let alphaVantageResult = {};

    for (let index = 0; index < tickersArray.length; index++) {
      const ticker = tickersArray[index];
      let result;
      if (index == 0){
        result = await getAlphaVantageMentionedStocks(req, res, createAlphaVantageOptionsTicker(ticker), ticker, null);
      } else {
        // console.log("Prev alpha res is:");
        // console.log(alphaVantageResult);
        result = await getAlphaVantageMentionedStocks(req, res, createAlphaVantageOptionsTicker(ticker), ticker, alphaVantageResult);
      }
      
      if(index == 0){
        alphaVantageResult = result;
      } else {
        alphaVantageResult["articleFeed"] =  alphaVantageResult["articleFeed"].concat(result["articleFeed"])
      }
    }
    let finnHubbResult = await getFinHubbCompanyNews(req, res, createFinnHubOptions(), alphaVantageResult);

    // console.log("multi result is:");
    // console.log(alphaVantageResult);
    res.status(200).send(alphaVantageResult);
  } catch (error) {
    console.error(error);
  }
});

async function getAlphaVantageMentionedStocks(req, res, options, aQueryTicker, prevJSON) {
  try {
    const url = `https://${options.hostname}${options.path}`;
    console.log(url);

    const response = await axios.get(url);
    // if (!("items" in response.data)) {
    //   res.status(400).send({
    //     error: "Thank you for using Wolf of Wall Street Bets API! Our search API call frequency is 5 calls per minute and 500 calls per day."
    //   });
    //   return;
    // }
    return await processAlphaVantageRes(req.query, response.data, aQueryTicker, prevJSON);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: error.message })
    return;
  }
}
async function getFinHubbCompanyNews(req, res, options, prevJSON) {
  try {
    for (let index = 0; index < prevJSON.articleFeed.length; index++) {
      let url = `https://${options.hostname}${options.path}`;
      const queryTicker = prevJSON.articleFeed[index].ticker;
      url += ("&symbol=" + queryTicker);
      const response = await axios.get(url);
      let currentResultsFound = 0;
      const numberOfResultsLimit = 3;

      for (let index = 0; index < response.data.length; index++) {
        const newsArticle = response.data[index];
        // console.log(newsArticle.url);
        if (currentResultsFound >= numberOfResultsLimit)
          break;
          
        let tickerArticleFeed = prevJSON.articleFeed.find(stock =>{
          return stock["ticker"] === queryTicker;
        })
        
        if (tickerArticleFeed.articles.some(article => article.ticker === queryTicker)){
          // console.log(relatedTicker);
          continue;
        }
        // console.log("tickerArticleFeed");
        // console.log(tickerArticleFeed);

        tickerArticleFeed.articles.push({
          title: newsArticle.headline,
          summary: newsArticle.summary,
          url: newsArticle.url,
          image: newsArticle.image,
          source: newsArticle.source,
          dateTimePublished: newsArticle.datetime,
          related: newsArticle.related
        });
        currentResultsFound++;
      }
      // response.data.forEach(article => {
      // });
      // console.log(response);
    }
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

function createFinnHubOptions() {
  // https://finnhub.io/api/v1/company-news?symbol=TSLA&from=2022-01-01&to=2022-12-31&token=cceud7qad3ifd4q5uqgg
  const options = {
    hostname: 'finnhub.io',
    path: '/api/v1/company-news?',
  }
  let currentDate = new Date()
  currentDate.toISOString().split('T')[0]

  let str = "&from=" + getYearAgoDate() +
    "&to=" + getCurrentDate() +
    "&token=" + finnHubAPI.apikey;

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

function processAlphaVantageRes(query, resData, aMultiQueryTicker, prevJSON) {
  let articleFeed = [];

  
  if(query["tickers"] && aMultiQueryTicker === null){
    let queryTickersArray = query["tickers"].split(",");
    queryTickersArray.forEach(ticker => {
      articleFeed.push({ticker, articles: []});
    });
  } else if (aMultiQueryTicker !== null) {
    articleFeed.push({ticker: aMultiQueryTicker, articles: []});
  }
  
  let currentResultsFound = 0;
  const numberOfResultsLimit = 3;

  articleLoop:
  for (let i = 0; i < resData.items; i++) {
    const article = resData.feed[i];

    tickerLoop:
    for (let j = 0; j < article.ticker_sentiment.length; j++) {
      let relatedTickerObj = article.ticker_sentiment[j];
      let relatedTicker = relatedTickerObj.ticker;

      if (currentResultsFound >= numberOfResultsLimit)
        break articleLoop;

      if (articleFeed.some(t => t.ticker === relatedTicker)){
        continue tickerLoop;
      } 
      if (relatedTicker.includes(":"))
        continue tickerLoop;
      if ((query["tickers"] !== undefined && query["tickers"].includes(relatedTicker)))
        continue tickerLoop;
      if ((prevJSON && prevJSON.articleFeed &&prevJSON.articleFeed.some(t => t.ticker === relatedTicker)))
        continue tickerLoop;

      articleFeed.push({
        ticker: relatedTicker,
        articles: [
          {
            title: article.title,
            summary: article.summary,
            url: article.url,
            image: article.banner_image,
            source: article.source,
            dateTimePublished: alphaVantageDateToISOString(article.time_published),
            topics: article.topics,
            related: (aMultiQueryTicker !== null ? aMultiQueryTicker : query.tickers)
          },
        ]
      });
      currentResultsFound++;
    }
  }
  let alphaVantageResultObj = {
    queryTickers: query["tickers"],
    queryTopics: query["topics"],
    articleFeed
  }
  return alphaVantageResultObj;
}

module.exports = router;
