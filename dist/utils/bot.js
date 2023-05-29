"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ccxt_1 = __importDefault(require("ccxt"));
const handlers_1 = require("./handlers");
const config_1 = require("../config");
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const envs_1 = require("../config/envs");
const fs_1 = __importDefault(require("fs"));
const exchange = new ccxt_1.default.binanceusdm({
    enableRateLimit: true,
    options: {
        defaultType: "future",
    },
});
const bot = new node_telegram_bot_api_1.default(envs_1.envsConfig.token_tele, { polling: true });
let pairState = {}; // State lưu trạng thái
// Load pairState from file if it exists
if (fs_1.default.existsSync("pairState.json")) {
    const pairStateData = fs_1.default.readFileSync("pairState.json", "utf-8");
    pairState = JSON.parse(pairStateData);
}
// Function to save pairState to file
function savePairStateToFile() {
    const pairStateData = JSON.stringify(pairState);
    fs_1.default.writeFileSync("pairState.json", pairStateData, "utf-8");
}
function saveSLTPToFile(slNumber, tpNumber) {
    const data = JSON.stringify({ slNumber, tpNumber });
    fs_1.default.writeFileSync("sltp.json", data, "utf-8");
}
function canCallAgain(symbol) {
    if (pairState[symbol]) {
        const { state, sl, time } = pairState[symbol];
        const endTime = new Date();
        const timeDiffInMilliseconds = endTime - time;
        const hoursPassed = Math.floor(timeDiffInMilliseconds / (1000 * 60 * 60));
        if (state === "SL" && hoursPassed >= 24) {
            delete pairState[symbol];
            savePairStateToFile();
            return true;
        }
    }
    return false;
}
function readSLTPFromFile() {
    if (fs_1.default.existsSync("sltp.json")) {
        const data = fs_1.default.readFileSync("sltp.json", "utf-8");
        const { slNumber, tpNumber } = JSON.parse(data);
        return { slNumber, tpNumber };
    }
    return { slNumber: 0, tpNumber: 0 };
}
let slNumber = 0;
let tpNumber = 0;
// Function để xử lý khi SL/TP được kích hoạt
// Load SL and TP from file if it exists
const { slNumber: savedSLNumber, tpNumber: savedTPNumber } = readSLTPFromFile();
slNumber = savedSLNumber;
tpNumber = savedTPNumber;
function handleSLTPTriggers(symbol, result) {
    return __awaiter(this, void 0, void 0, function* () {
        // Kiểm tra trạng thái của cặp giao dịch
        if (pairState[symbol]) {
            const { state, entry, sl, tp, time } = pairState[symbol];
            const endTime = new Date();
            const timeDiffInMilliseconds = endTime - time;
            const minutes = Math.floor((timeDiffInMilliseconds / (1000 * 60)) % 60);
            const hours = Math.floor((timeDiffInMilliseconds / (1000 * 60 * 60)) % 24);
            const days = Math.floor(timeDiffInMilliseconds / (1000 * 60 * 60 * 24));
            console.log(`Lệnh đã chạm ${result} cho cặp giao dịch ${symbol}`);
            console.log(`Lệnh giao dịch đã được đóng.`);
            const message = `
                        😏Lệnh đã chạm ${result} cho cặp giao dịch ${symbol}
                        Lệnh giao dịch đã được đóng trong ${days} ngày ${hours} giờ ${minutes} phút. 👊 
                    `;
            bot.sendMessage(envs_1.envsConfig.chat_id, message);
            if (result === "Stoploss ❌") {
                slNumber += 1;
                pairState[symbol].state = "SL";
                savePairStateToFile();
            }
            else if (result === "Take Profit ✅")
                tpNumber += 1;
            // Reset trạng thái của cặp giao dịch
            delete pairState[symbol];
            savePairStateToFile();
            saveSLTPToFile(slNumber, tpNumber);
        }
    });
}
function runTradingStrategy() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log(`=== Run ${new Date().toLocaleString()} ===`);
            const markets = yield exchange.fetchMarkets(); // lấy các cặp giao dịch
            for (const market of markets) {
                const symbol = market.symbol;
                // const baseCurrency = market.base;
                const quoteCurrency = market.quote;
                const timeframe = "1h"; // Khung thời gian H1
                // Kiểm tra cặp giao dịch có tiền tệ là USDT
                if (quoteCurrency !== "USDT") {
                    continue; // Bỏ qua cặp giao dịch không liên quan đến USDT
                }
                // Lấy dữ liệu giá cả từ sàn giao dịch cho từng cặp giao dịch (coin)
                const candles = yield exchange.fetchOHLCV(symbol, timeframe);
                if (!candles)
                    continue;
                // Tính toán Bollinger Bands
                const bollingerBands = (0, handlers_1.calculateBollingerBands)(candles, config_1.initCaculate.pollingerBandPeriod, config_1.initCaculate.stdDevMultiplier);
                // Xác định điểm vào giao dịch dựa trên Bollinger Bands
                const lastCandle = candles[candles.length - 1];
                const lastClose = lastCandle[4]; // Giá đóng cửa gần nhất
                const upperBand = bollingerBands.upperBand[bollingerBands.upperBand.length - 1];
                const lowerBand = bollingerBands.lowerBand[bollingerBands.lowerBand.length - 1];
                /// Tính toán RSI
                const closePrices = candles.map((candle) => candle[4]); // Mảng giá đóng cửa
                const rsiValues = (0, handlers_1.calculateRSI)(closePrices, config_1.initCaculate.rsiPeriod);
                const lastRSI = rsiValues[rsiValues.length - 1];
                // Tính toán MACD
                const macdValues = (0, handlers_1.calculateMACD)(candles, config_1.initCaculate.macdShortPeriod, config_1.initCaculate.macdLongPeriod, config_1.initCaculate.macdSignalPeriod);
                const lastMACD = macdValues[macdValues.length - 1];
                if (canCallAgain(symbol)) {
                    console.log(`Token ${symbol} can be called again.`);
                    continue;
                }
                if (pairState[symbol]) {
                    const { state, sl, tp } = pairState[symbol];
                    const lastPrice = lastClose;
                    if (state === "long" && (lastPrice <= sl || lastPrice >= tp)) {
                        const result = lastPrice <= sl ? "Stoploss ❌" : "Take Profit ✅";
                        handleSLTPTriggers(symbol, result);
                    }
                    else if (state === "short" && (lastPrice >= sl || lastPrice <= tp)) {
                        const result = lastPrice >= sl ? "Stoploss ❌" : "Take Profit ✅";
                        handleSLTPTriggers(symbol, result);
                    }
                }
                else {
                    if (lastClose > upperBand &&
                        lastRSI > 70 &&
                        lastMACD.histogram > 0 &&
                        lastMACD.macd > lastMACD.signal) {
                        const entryPrice = lastClose;
                        const { stopLoss, takeProfit } = (0, handlers_1.calculateShortSLTP)(entryPrice);
                        pairState[symbol] = {
                            state: "short",
                            entry: entryPrice,
                            sl: stopLoss,
                            tp: takeProfit,
                            time: new Date(),
                        };
                        const message = `
                        🚀 Điểm short (bán) giao dịch ${symbol}

                        🎯 Entry Price: ${entryPrice}

                        ✅ Take Profit: ${takeProfit}

                        ❌ Stop Loss: ${stopLoss}
                     
                    `;
                        bot.sendMessage(envs_1.envsConfig.chat_id, message);
                        console.log(`Điểm short (bán) giao dịch ${symbol}`);
                        console.log(`Entry Price: ${entryPrice}`);
                        console.log(`Stop Loss: ${stopLoss}`);
                        console.log(`Take Profit: ${takeProfit}`);
                    }
                    else if (lastClose < lowerBand &&
                        lastRSI < 30 &&
                        lastMACD.histogram < 0 &&
                        lastMACD.macd < lastMACD.signal) {
                        const entryPrice = lastClose;
                        const { stopLoss, takeProfit } = (0, handlers_1.calculateLongSLTP)(entryPrice);
                        pairState[symbol] = {
                            state: "long",
                            entry: entryPrice,
                            sl: stopLoss,
                            tp: takeProfit,
                            time: new Date(),
                        };
                        const message = `
                        🚀 Điểm long (mua) giao dịch ${symbol}

                        🎯 Entry Price: ${entryPrice}

                        ✅ Take Profit: ${takeProfit}
                        
                        ❌ Stop Loss: ${stopLoss}
                        
                     `;
                        bot.sendMessage(envs_1.envsConfig.chat_id, message);
                        console.log(`Điểm long (mua) giao dịch ${symbol}`);
                        console.log(`Entry Price: ${entryPrice}`);
                        console.log(`Stop Loss: ${stopLoss}`);
                        console.log(`Take Profit: ${takeProfit}`);
                    }
                }
            }
            savePairStateToFile();
        }
        catch (error) {
            console.log("có lỗi xảy ra", error);
        }
    });
}
function runOnce() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield runTradingStrategy();
        }
        catch (error) {
            console.error("Đã xảy ra lỗi:", error);
        }
    });
}
exports.default = runOnce;
