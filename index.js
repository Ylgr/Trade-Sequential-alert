const axios = require('axios');
const TDSequential = require('tdsequential');
const Ichimoku = require('ichimoku');

const binanceApiEndpoint = 'https://api.binance.com';

let candleTimeRangeMap = new Map();
candleTimeRangeMap.set('1h', 3600000)

const symbolList = ['BTCUSDT'];

const instance = axios.create({
    headers: { 'Content-Type': 'application/json'},
    responseType: 'json',
    crossDomain: true,
    withCredentials: false
});

function candleStickBuildParam(symbol, interval, startTime, endTime, limit = 500) {
    return `${binanceApiEndpoint}/api/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${startTime}&endTime=${endTime}&limit=${limit}`;
}

const ichimoku = new Ichimoku({
    conversionPeriod : 9,
    basePeriod       : 26,
    spanPeriod       : 52,
    displacement     : 26,
    values           : []
})

const now = Date.now();
candleTimeRangeMap.forEach((timeRangeValue, timeRangeKey)  => {
    const roundTimeNow = now - now%timeRangeValue;
    const timeIn52SessionBefore = roundTimeNow - timeRangeValue*52;
    symbolList.forEach(symbol => {
        instance.get(candleStickBuildParam(symbol, timeRangeKey, timeIn52SessionBefore, roundTimeNow))
            .then(response => {
                const marketInfos = response.data.map(function(marketInfoRaw) {
                    ichimoku.nextValue({
                        high: marketInfoRaw[2],
                        low: marketInfoRaw[3],
                        close: marketInfoRaw[4]
                    })
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
                console.log("TDSequential result: ", JSON.stringify(tdResult, null, 2));
                console.log("Ichimoku result: ", JSON.stringify(ichimoku));
            }).catch(err => console.log('Error: ',err));
    })
});