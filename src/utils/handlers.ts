import { rewardPercentage, riskPercentage } from "../config";

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
function calculateRSI(values, period) {
    const rsi = [];

    for (let i = period; i < values.length; i++) {
        const gains = [];
        const losses = [];

        for (let j = i - period; j < i; j++) {
            const priceDiff = values[j + 1] - values[j];

            if (priceDiff > 0) {
                gains.push(priceDiff);
            } else if (priceDiff < 0) {
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
    const stopLoss = entryPrice - (entryPrice * riskPercentage);
    const takeProfit = entryPrice + (entryPrice * rewardPercentage);
    return { stopLoss, takeProfit };
}

// Hàm xác định Stop Loss (SL) và Take Profit (TP) cho lệnh "short"
function calculateShortSLTP(entryPrice) {

    const stopLoss = entryPrice + (entryPrice * riskPercentage);
    const takeProfit = entryPrice - (entryPrice * rewardPercentage);

    return { stopLoss, takeProfit };
}

export {
    calculateStandardDeviation,
    calculateBollingerBands,
    calculateRSI,
    calculateLongSLTP,
    calculateShortSLTP
}