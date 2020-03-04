const axios = require('axios');
const TDSequential = require('tdsequential');
const fs = require('fs');
const util = require('util');
const ichimoku = require('./ichimoku.js');

const binanceApiEndpoint = 'https://api.binance.com';

let candleTimeRangeMap = new Map();
candleTimeRangeMap.set('1h', { timeDuration: 3600000, addtionTime: 0});
candleTimeRangeMap.set('4h', { timeDuration: 14400000, addtionTime: 0});
candleTimeRangeMap.set('1d', { timeDuration: 86400000, addtionTime: 86400000});
candleTimeRangeMap.set('3d', { timeDuration: 259200000, addtionTime: 172800000});
candleTimeRangeMap.set('1w', { timeDuration: 604800000, addtionTime: 259200000});

const usingRealTimeApiData = true;

const symbolList = ['BTCUSDT'];

const readFile = util.promisify(fs.readFile);

const instance = axios.create({
  headers: {
    'Content-Type': 'application/json'
  },
  responseType: 'json',
  crossDomain: true,
  withCredentials: false
});

function candleStickBuildParam(symbol, interval, startTime, endTime, limit = 500) {
  return `${binanceApiEndpoint}/api/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${startTime}&endTime=${endTime}&limit=${limit}`;
}

function createMockData(mockFileName, content) {
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

function idicatorAnalysisAndNotify(currentPrice, timeRangeKey, timeRangeValue, symbol) {
  const now = Date.now();
  const roundTimeNow = now - now % timeRangeValue.timeDuration - timeRangeValue.addtionTime;
  const timeIn150SessionBefore = roundTimeNow - timeRangeValue.timeDuration * 150;
  // console.log(`Getting time ${timeRangeKey}: `);
  // console.log('timeDuration: ', timeRangeValue.timeDuration);
  // console.log('now:', now);
  // console.log('roundTimeNow:', roundTimeNow);
  // console.log('timeIn100SessionBefore: ', timeIn100SessionBefore);
  const dataRequest = usingRealTimeApiData ? instance.get(candleStickBuildParam(symbol, timeRangeKey, timeIn150SessionBefore, roundTimeNow)) :
    readFile('./' + mockFileName)

  dataRequest.then(response => {
    const responseData = usingRealTimeApiData ? response.data : JSON.parse(response)
    usingRealTimeApiData ? createMockData(`mockData-${symbol}-${timeRangeKey}.json`, responseData) : {}
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
    const ichimokuDynamicResist = ichimoku.ichimokuDynamicResistCaculator(currentPrice, marketInfos, roundTimeNow, timeRangeValue.timeDuration);
    const ichimokuStaticClosestPriceResist = ichimoku.getClosestResists(currentPrice, marketInfos, roundTimeNow, timeRangeValue.timeDuration)
    const lastTdResult = tdResult[tdResult.length - 1];
    telegramMessageRequest(testChannelId, `Khung ${timeRangeKey} Binance: \n` +
      `Giá cặp ${symbol} hiện tại: ${currentPrice}` +
      '\nTín hiệu TD Sequential: \n' +
      `Chỉ số mua: ${lastTdResult.buySetupIndex} \n` +
      `Chỉ số bán: ${lastTdResult.sellSetupIndex} \n` +
      '\nTín hiệu Ichimoku: \n' +
      `Kháng cự / Hỗ trợ động: ${JSON.stringify(ichimokuDynamicResist, null, 2)} \n` +
      `Kháng cự / Hỗ trợ tĩnh gần giá nhất: \n` +
      // `Tenkan Sen - Kháng cự: ${ichimokuStaticClosestPriceResist.closestResistTenkanSen}\n` +
      // `Tenkan Sen - Hỗ trợ: ${ichimokuStaticClosestPriceResist.closestSupportTenkanSen}\n` +
      `Kijun Sen - Kháng cự: ${ichimokuStaticClosestPriceResist.closestResistKijunSen}\n` +
      `Kijun Sen - Hỗ trợ: ${ichimokuStaticClosestPriceResist.closestSupportKijunSen}\n` +
      `Senkou Span B - Kháng cự: ${ichimokuStaticClosestPriceResist.closestResistSenkouSpanB}\n` +
      `Senkou Span B - Hỗ trợ: ${ichimokuStaticClosestPriceResist.closestSupportSenkouSpanB}\n`
    );
  }).catch(err => console.log('Error: ', err));
};

async function getCurrentPrice(symbol) {
  return instance.get(`${binanceApiEndpoint}/api/v3/ticker/price?symbol=${symbol}`);
}

(async () => {
  try {
    symbolList.forEach(async (symbol) => {
      const currentPrice = await getCurrentPrice(symbol);
      candleTimeRangeMap.forEach((timeRangeValue, timeRangeKey) => {
        idicatorAnalysisAndNotify(currentPrice.data.price, timeRangeKey, timeRangeValue, symbol)
      })
    });
  } catch (e) {
    telegramMessageRequest(testChannelId, e)
  }
})();