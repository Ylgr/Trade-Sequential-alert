const { range } = require('lodash');

function avgHighLow(marketInfos, timeget, sessions) {
    const indexTimeget = marketInfos.indexOf(marketInfos.find(marketInfo => marketInfo.time === timeget))
    if (indexTimeget - sessions < 0) return -1;
    const subInfos = marketInfos.slice(indexTimeget - sessions, indexTimeget);
    const highestPrice =  Math.max.apply(null, subInfos.map(marketInfo => marketInfo.high) );
    const lowestPrice =  Math.min.apply(null, subInfos.map(marketInfo => marketInfo.low) );
    return (highestPrice + lowestPrice)/2;
}

function ichimokuCaculator(marketInfos, timeget) {
    const tenkanSen = avgHighLow(marketInfos, timeget, 9);
    const kijunSen = avgHighLow(marketInfos, timeget, 26);
    return {
        tenkanSen: tenkanSen,
        kijunSen:  kijunSen,
        senkouSpanA:  (tenkanSen + kijunSen)/2,
        senkouSpanB: avgHighLow(marketInfos, timeget, 52)
    }
}

function ichimokuDynamicResistCaculator(marketInfos, timeget, timeRangeValue) {
    const currentCacul = ichimokuCaculator(marketInfos, timeget)
    const cacul26Before = ichimokuCaculator(marketInfos, timeget - timeRangeValue*24)
    return {
        tenkanSen: currentCacul.tenkanSen,
        kijunSen: currentCacul.kijunSen,
        senkouSpanA: cacul26Before.senkouSpanA,
        senkouSpanB: cacul26Before.senkouSpanB
    }
}

function ichimokuStaticResistCaculator(marketInfos, timeget, timeRangeValue, sessions = 100) {
    const tenkanSenResists = [];
    const kijunSenResists = [];
    const senkouSpanBResists = [];

    let checkTenkanSenResist = {
        price: 0,
        loopTime: 0
    }
    let checkKijunSenResist = {
        price: 0,
        loopTime: 0
    }
    let checkSenkouSpanBResist = {
        price: 0,
        loopTime: 0
    }
    let i;
    for(i = 0; i < sessions; i ++) {
        const checking = ichimokuCaculator(marketInfos, timeget - timeRangeValue*i)
        if (checkTenkanSenResist.price === checking.tenkanSen) {
            if (checkTenkanSenResist.loopTime >= 3 && tenkanSenResists.indexOf(checkTenkanSenResist.price) === -1) {
                tenkanSenResists.push(checkTenkanSenResist.price)
            }
            checkTenkanSenResist.loopTime++
        } else {
            checkTenkanSenResist.price = checking.tenkanSen
        }
        if (checkKijunSenResist.price === checking.kijunSen) {
            if (checkKijunSenResist.loopTime >= 3 && kijunSenResists.indexOf(checkKijunSenResist.price) === -1) {
                kijunSenResists.push(checkKijunSenResist.price)
            }
            checkKijunSenResist.loopTime++
        } else {
            checkKijunSenResist.price = checking.kijunSen
        }
        if (checkSenkouSpanBResist.price === checking.senkouSpanB) {
            if (checkSenkouSpanBResist.loopTime >= 3 && senkouSpanBResists.indexOf(checkSenkouSpanBResist.price) === -1) {
                senkouSpanBResists.push(checkSenkouSpanBResist.price)
            }
            checkSenkouSpanBResist.loopTime++
        } else {
            checkSenkouSpanBResist.price = checking.senkouSpanB
        }
    }
    return {
        tenkanSenResists: tenkanSenResists,
        kijunSenResists: kijunSenResists,
        senkouSpanBResists: senkouSpanBResists
    }
}

function getClosestResists(currentPrice, marketInfos, timeget, timeRangeValue, sessions = 100) {
    const resists = ichimokuStaticResistCaculator(marketInfos, timeget, timeRangeValue, sessions);

    const closestResistTenkanSen = resists.tenkanSenResists.reduce(function(prev, curr) {
        return (Math.abs(curr - currentPrice) > Math.abs(prev - currentPrice) ? curr : prev);
    });
    const closestSupportTenkanSen = resists.tenkanSenResists.reduce(function(prev, curr) {
        return (Math.abs(curr - currentPrice) < Math.abs(prev - currentPrice) ? curr : prev);
    });
    
    const closestResistKijunSen = resists.kijunSenResists.reduce(function(prev, curr) {
        return (Math.abs(curr - currentPrice) > Math.abs(prev - currentPrice) ? curr : prev);
    });
    const closestSupportKijunSen = resists.kijunSenResists.reduce(function(prev, curr) {
        return (Math.abs(curr - currentPrice) < Math.abs(prev - currentPrice) ? curr : prev);
    });
    
    const closestResistSenkouSpanB = resists.senkouSpanBResists.reduce(function(prev, curr) {
        return (Math.abs(curr - currentPrice) > Math.abs(prev - currentPrice) ? curr : prev);
    });
    const closestSupportSenkouSpanB = resists.senkouSpanBResists.reduce(function(prev, curr) {
        return (Math.abs(curr - currentPrice) < Math.abs(prev - currentPrice) ? curr : prev);
    });
    return {
        closestResistTenkanSen: closestResistTenkanSen,
        closestSupportTenkanSen: closestSupportTenkanSen,
        closestResistKijunSen: closestResistKijunSen,
        closestSupportKijunSen: closestSupportKijunSen,
        closestResistSenkouSpanB: closestResistSenkouSpanB,
        closestSupportSenkouSpanB: closestSupportSenkouSpanB,
    }
}


module.exports = {
    ichimokuCaculator,
    ichimokuDynamicResistCaculator,
    ichimokuStaticResistCaculator,
    getClosestResists
}

