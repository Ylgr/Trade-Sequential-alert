const axios = require('axios');
const TDSequential = require('tdsequential');
const fs = require('fs');
const util = require('util');
const ichimoku = require('./ichimoku.js');

const binanceApiEndpoint = 'https://api.binance.com';

let candleTimeRangeMap = new Map();
candleTimeRangeMap.set('1h', 3600000);

const usingRealTimeApiData = true;

const mockFileName = 'mockData.json';

const symbolList = ['BTCUSDT'];

const readFile = util.promisify(fs.readFile);

const instance = axios.create({
  headers: {'Content-Type': 'application/json'},
  responseType: 'json',
  crossDomain: true,
  withCredentials: false
});

function candleStickBuildParam(symbol, interval, startTime, endTime, limit = 500) {
  return `${binanceApiEndpoint}/api/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${startTime}&endTime=${endTime}&limit=${limit}`;
}

function createMockData(content) {
  fs.writeFile('./' + mockFileName, JSON.stringify(content, null, 2), function (err) {
    if (err) {
      return console.log(err);
    }
  });
}

const telegramToken = '933051371:AAF4sE3732Rq4KaCJCPHn5zynOedYJPUmQo';

const testChannelId = '-1001348986056';

function telegramMessageRequest(channelId, text) {
  return instance.get('https://api.telegram.org/bot' + telegramToken + '/sendMessage?chat_id=' + channelId + '&text=' + encodeURIComponent(text))
}

const now = Date.now();
candleTimeRangeMap.forEach((timeRangeValue, timeRangeKey) => {
  const roundTimeNow = now - now % timeRangeValue;
  const timeIn500SessionBefore = roundTimeNow - timeRangeValue * 500;
  symbolList.forEach(symbol => {
    const dataRequest = usingRealTimeApiData ? instance.get(candleStickBuildParam(symbol, timeRangeKey, timeIn500SessionBefore, roundTimeNow))
      : readFile('./' + mockFileName)

    dataRequest.then(response => {
      const responseData = usingRealTimeApiData? response.data: JSON.parse(response)
      usingRealTimeApiData ? createMockData(responseData) : {}
      const marketInfos = responseData.map(function (marketInfoRaw) {
        return {
          time: marketInfoRaw[0],
          open: marketInfoRaw[1],
          high: marketInfoRaw[2],
          low: marketInfoRaw[3],
          close: marketInfoRaw[4],
          volume: marketInfoRaw[5]
        }
      })

      const tdResult = TDSequential(marketInfos);
      const ichimokuResponse = ichimoku.ichimokuCaculator(marketInfos, roundTimeNow);
      const ichimokuDynamicResist = ichimoku.ichimokuDynamicResistCaculator(marketInfos, roundTimeNow, timeRangeValue);
      const ichimokuStaticResist = ichimoku.ichimokuStaticResistCaculator(marketInfos, roundTimeNow, timeRangeValue);
      const ichimokuStaticClosestPriceResist =ichimoku.getClosestResists(8688 , marketInfos, roundTimeNow, timeRangeValue)
      const lastTdResult = tdResult[tdResult.length - 1];
      // console.log("TDSequential result: ", JSON.stringify(tdResult[tdResult.length - 1], null, 2));
      // console.log("Ichimoku result: ", ichimokuResponse);
      // console.log("Ichimoku Dynamic Res result: ", ichimokuDynamicResist);
      // console.log("Ichimoku Static Res result: ", ichimokuStaticResist);
      // console.log("Current Res result: ", ichimokuStaticClosestPriceResist);
      telegramMessageRequest(testChannelId, 'Khung 1h Binance: ');
      telegramMessageRequest(testChannelId, 'Tín hiệu TD Sequential: \n' + 
      `Chỉ số mua: ${lastTdResult.buySetupIndex} \n` +
      `Chỉ số bán: ${lastTdResult.sellSetupIndex} \n`
      );
      telegramMessageRequest(testChannelId, 'Tín hiệu Ichimoku: \n' + 
      `Kháng cự động: ${JSON.stringify(ichimokuDynamicResist, null, 2)} \n` +
      `Kháng cự tĩnh gần giá nhất: \n` + 
      `Tenkan Sen - Kháng cự: ${ichimokuStaticClosestPriceResist.closestResistTenkanSen}\n` +
      `Tenkan Sen - Hỗ trợ: ${ichimokuStaticClosestPriceResist.closestSupportTenkanSen}\n` +
      `Kijun Sen - Kháng cự: ${ichimokuStaticClosestPriceResist.closestResistKijunSen}\n` +
      `Kijun Sen - Hỗ trợ: ${ichimokuStaticClosestPriceResist.closestSupportKijunSen}\n` +
      `Senkou Span B - Kháng cự: ${ichimokuStaticClosestPriceResist.closestResistSenkouSpanB}\n` +
      `Senkou Span B - Hỗ trợ: ${ichimokuStaticClosestPriceResist.closestSupportSenkouSpanB}\n`
      );
    }).catch(err => console.log('Error: ', err));
  })
});
