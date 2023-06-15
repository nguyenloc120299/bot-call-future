"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateEMA = exports.calculateMACD = exports.calculateShortSLTP = exports.calculateLongSLTP = exports.calculateRSI = exports.calculateBollingerBands = exports.calculateStandardDeviation = void 0;
const config_1 = require("../config");
function calculateAverage(values) {
    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
}
function calculateStandardDeviation(values, period) {
    const stdDev = [];
    for (let i = period - 1; i < values.length; i++) {
        const subset = values.slice(i - period + 1, i + 1);
        const mean = calculateAverage(subset);
        const sumSquares = subset.reduce((a, b) => a + Math.pow(b - mean, 2), 0);
        const variance = sumSquares / period;
        stdDev.push(Math.sqrt(variance));
    }
    return stdDev;
}
exports.calculateStandardDeviation = calculateStandardDeviation;
function calculateRSI(values, period) {
    const rsi = [];
    for (let i = period; i < values.length; i++) {
        const gains = [];
        const losses = [];
        for (let j = i - period; j < i; j++) {
            const priceDiff = values[j + 1] - values[j];
            if (priceDiff > 0) {
                gains.push(priceDiff);
            }
            else if (priceDiff < 0) {
                losses.push(Math.abs(priceDiff));
            }
        }
        const avgGain = calculateAverage(gains);
        const avgLoss = calculateAverage(losses);
        const rs = avgLoss !== 0 ? avgGain / avgLoss : 0;
        const rsiValue = 100 - (100 / (1 + rs));
        rsi.push(rsiValue);
    }
    return rsi;
}
exports.calculateRSI = calculateRSI;
// Hàm tính toán Bollinger Bands
function calculateBollingerBands(candles, period, stdDevMultiplier) {
    const closePrices = candles.map(candle => candle[4]); // Mảng giá đóng cửa
    const sma = calculateSMA(closePrices, period); // Đường trung bình động
    const stdDev = calculateStdDev(closePrices, period); // Độ lệch chuẩn
    const upperBand = sma.map((value, index) => value + (stdDev[index] * stdDevMultiplier)); // Đường bên ngoài trên
    const lowerBand = sma.map((value, index) => value - (stdDev[index] * stdDevMultiplier)); // Đường bên ngoài dưới
    return {
        middleBand: sma,
        upperBand,
        lowerBand
    };
}
exports.calculateBollingerBands = calculateBollingerBands;
// Hàm tính toán đường trung bình động (SMA)
function calculateSMA(values, period) {
    const sma = [];
    for (let i = period - 1; i < values.length; i++) {
        const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        sma.push(sum / period);
    }
    return sma;
}
// Hàm tính toán độ lệch chuẩn (Standard Deviation)
function calculateStdDev(values, period) {
    const stdDev = [];
    for (let i = period - 1; i < values.length; i++) {
        const subset = values.slice(i - period + 1, i + 1);
        const mean = subset.reduce((a, b) => a + b, 0) / period;
        const sumSquares = subset.reduce((a, b) => a + Math.pow(b - mean, 2), 0);
        const variance = sumSquares / period;
        stdDev.push(Math.sqrt(variance));
    }
    return stdDev;
}
function calculateLongSLTP(entryPrice) {
    const stopLoss = entryPrice - (entryPrice * config_1.riskPercentage);
    const takeProfit = entryPrice + (entryPrice * config_1.rewardPercentage);
    return { stopLoss, takeProfit };
}
exports.calculateLongSLTP = calculateLongSLTP;
// Hàm xác định Stop Loss (SL) và Take Profit (TP) cho lệnh "short"
function calculateShortSLTP(entryPrice) {
    const stopLoss = entryPrice + (entryPrice * config_1.riskPercentage);
    const takeProfit = entryPrice - (entryPrice * config_1.rewardPercentage);
    return { stopLoss, takeProfit };
}
exports.calculateShortSLTP = calculateShortSLTP;
function calculateMACD(candles, shortPeriod, longPeriod, signalPeriod) {
    const closePrices = candles.map((candle) => candle[4]); // Array of closing prices
    const macdValues = [];
    // Calculate the short-term EMA
    const shortEMA = calculateEMA(closePrices, shortPeriod);
    // Calculate the long-term EMA
    const longEMA = calculateEMA(closePrices, longPeriod);
    // Calculate the MACD line
    const macdLine = shortEMA.map((shortEMAValue, index) => shortEMAValue - longEMA[index]);
    // Calculate the signal line (trigger line)
    const signalLine = calculateEMA(macdLine, signalPeriod);
    // Calculate the MACD histogram
    const histogram = macdLine.map((macdValue, index) => macdValue - signalLine[index]);
    for (let i = 0; i < macdLine.length; i++) {
        macdValues.push({
            macd: macdLine[i],
            signal: signalLine[i],
            histogram: histogram[i],
        });
    }
    return macdValues;
}
exports.calculateMACD = calculateMACD;
// Function to calculate the Exponential Moving Average (EMA)
function calculateEMA(data, period) {
    const emaArray = [];
    const multiplier = 2 / (period + 1);
    let prevEMA = 0;
    for (let i = 0; i < data.length; i++) {
        const closePrice = data[i][4]; // Assuming the close price is located at index 4
        if (i < period - 1) {
            // For the initial period, use the simple moving average as the EMA
            const sma = data.slice(0, i + 1).reduce((sum, val) => sum + val[4], 0) / (i + 1);
            emaArray.push(sma);
            prevEMA = sma;
        }
        else {
            const ema = (closePrice - prevEMA) * multiplier + prevEMA;
            emaArray.push(ema);
            prevEMA = ema;
        }
    }
    return emaArray;
}
exports.calculateEMA = calculateEMA;
