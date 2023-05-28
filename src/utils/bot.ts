import ccxt from "ccxt";
import { calculateBollingerBands, calculateLongSLTP, calculateRSI, calculateShortSLTP } from "./handlers";
import { initCaculate } from "../config";
import { PAIR_STATE } from "../types/global";
import TelegramBot from 'node-telegram-bot-api'
import { envsConfig } from "../config/envs";

const exchange = new ccxt.binanceusdm({
    enableRateLimit: true,
    options: {
        defaultType: 'future',
    },
})
const bot = new TelegramBot(envsConfig.token_tele, { polling: true });

const pairState = {} as PAIR_STATE; // State lưu trạng thái


// Function để xử lý khi SL/TP được kích hoạt
async function handleSLTPTriggers(symbol, result) {
    // Kiểm tra trạng thái của cặp giao dịch
    if (pairState[symbol]) {
        const { state, entry, sl, tp, time } = pairState[symbol];
        const endTime = new Date() as any;
        const timeDiffInHours = (endTime - time) / 1000 / 60 / 60;
        const days = Math.floor(timeDiffInHours / 24);
        const hours = timeDiffInHours % 24;
        console.log(`Lệnh đã chạm ${result} cho cặp giao dịch ${symbol}`);
        console.log(`Lệnh giao dịch đã được đóng.`);
        const message = `
                        Lệnh đã chạm ${result} cho cặp giao dịch ${symbol}
                        Lệnh giao dịch đã được đóng trong ${days} ngày ${hours} giờ. 👊 
                    `;
        bot.sendMessage(envsConfig.chat_id, message);
        // Reset trạng thái của cặp giao dịch
        delete pairState[symbol];

    }
}
async function runTradingStrategy() {
    try {
        console.log(`=== Run ${new Date().toLocaleString()} ===`);

        const markets = await exchange.fetchMarkets(); // lấy các cặp giao dịch
        for (const market of markets) {
            const symbol = market.symbol;
            // const baseCurrency = market.base;
            const quoteCurrency = market.quote;
            const timeframe = '1h'; // Khung thời gian H1
            // Kiểm tra cặp giao dịch có tiền tệ là USDT
            if (quoteCurrency !== 'USDT') {
                continue; // Bỏ qua cặp giao dịch không liên quan đến USDT
            }
            // Lấy dữ liệu giá cả từ sàn giao dịch cho từng cặp giao dịch (coin)
            const candles = await exchange.fetchOHLCV(symbol, timeframe);

            if (!candles) continue
            // Tính toán Bollinger Bands


            const bollingerBands = calculateBollingerBands(candles, initCaculate.pollingerBandPeriod, initCaculate.stdDevMultiplier);

            // Xác định điểm vào giao dịch dựa trên Bollinger Bands
            const lastCandle = candles[candles.length - 1];
            const lastClose = lastCandle[4]; // Giá đóng cửa gần nhất
            const upperBand = bollingerBands.upperBand[bollingerBands.upperBand.length - 1];
            const lowerBand = bollingerBands.lowerBand[bollingerBands.lowerBand.length - 1];

            /// Tính toán RSI 
            const closePrices = candles.map(candle => candle[4]); // Mảng giá đóng cửa
            const rsiValues = calculateRSI(closePrices, initCaculate.rsiPeriod);
            const lastRSI = rsiValues[rsiValues.length - 1];
            if (pairState[symbol]) {
                const { state, sl, tp } = pairState[symbol];
                const lastPrice = lastClose
                if (state === 'long' && (lastPrice <= sl || lastPrice >= tp)) {
                    const result = lastPrice <= sl ? "Stoploss ❌" : "Take Profit 😏"
                    handleSLTPTriggers(symbol, result);
                }
                else if (state === 'short' && (lastPrice >= sl || lastPrice <= tp)) {
                    const result = lastPrice <= sl ? "Stoploss ❌" : "Take Profit 😏"
                    handleSLTPTriggers(symbol, result)
                }
            }
            else {
                if (lastClose > upperBand && lastRSI > 70) {
                    const entryPrice = lastClose;
                    const { stopLoss, takeProfit } = calculateShortSLTP(entryPrice)
                    pairState[symbol] = {
                        state: 'short',
                        entry: entryPrice,
                        sl: stopLoss,
                        tp: takeProfit,
                        time: new Date()
                    };
                    const message = `
                        🚀 Điểm short (bán) giao dịch ${symbol}

                        🎯 Entry Price: ${entryPrice}

                        ✅ Take Profit: ${takeProfit}

                        ❌ Stop Loss: ${stopLoss}
                     
                    `;
                    bot.sendMessage(envsConfig.chat_id, message);

                    console.log(`Điểm short (bán) giao dịch ${symbol}`);
                    console.log(`Entry Price: ${entryPrice}`);
                    console.log(`Stop Loss: ${stopLoss}`);
                    console.log(`Take Profit: ${takeProfit}`);
                }
                else if (lastClose < lowerBand && lastRSI < 30) {
                    const entryPrice = lastClose;
                    const { stopLoss, takeProfit } = calculateLongSLTP(entryPrice)
                    pairState[symbol] = {
                        state: 'long',
                        entry: entryPrice,
                        sl: stopLoss,
                        tp: takeProfit,
                        time: new Date()
                    };

                    const message = `
                        🚀 Điểm long (mua) giao dịch ${symbol}

                        🎯 Entry Price: ${entryPrice}

                        ✅ Take Profit: ${takeProfit}
                        
                        ❌ Stop Loss: ${stopLoss}
                        
                     `;
                    bot.sendMessage(envsConfig.chat_id, message);

                    console.log(`Điểm long (mua) giao dịch ${symbol}`);
                    console.log(`Entry Price: ${entryPrice}`);
                    console.log(`Stop Loss: ${stopLoss}`);
                    console.log(`Take Profit: ${takeProfit}`);
                }
            }
        }
    } catch (error) {
        console.log("có lỗi xảy ra", error);

    }

}
async function runOnce() {
    try {

        await runTradingStrategy();
    } catch (error) {
        console.error('Đã xảy ra lỗi:', error);
    }
}
export default runOnce