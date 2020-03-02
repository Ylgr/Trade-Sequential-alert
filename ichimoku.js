function avgHighLow(marketInfos, timeget, candleTimeRange, sessions) {
    const indexTimeget = marketInfos.find(marketInfo => marketInfo.time === timeget)
    if (indexTimeget - sessions < 0) return -1;
    const subInfos = marketInfos.slice(indexTimeget - sessions, indexTimeget);
    const highestPrice = Math.max( marketInfos.map(marketInfo => marketInfo.high) );
    const lowestPrice = Math.min( marketInfos.map(marketInfo => marketInfo.low) );
    return (highestPrice + lowestPrice)/2;
}

module.exports = {
    ichimokuCaculator : function (marketInfos, timeget, candleTimeRange) {
        return {
            tenkanSen: avgHighLow(marketInfos, 9),
            kijunSen:  avgHighLow(marketInfos, 26),
            senkouSpanA:  (avgHighLow(marketInfos, 9) + avgHighLow(marketInfos, 26))/2,
            senkouSpanB: avgHighLow(marketInfos, 52)
        }
    }
}

