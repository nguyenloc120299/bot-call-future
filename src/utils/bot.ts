import ccxt from "ccxt";
import {
  calculateBollingerBands,
  calculateLongSLTP,
  calculateMACD,
  calculateRSI,
  calculateShortSLTP,
} from "./handlers";
import { initCaculate } from "../config";
import { PAIR_STATE } from "../types/global";
import TelegramBot from "node-telegram-bot-api";
import { envsConfig } from "../config/envs";
import fs from "fs";
const exchange = new ccxt.binanceusdm({
  enableRateLimit: true,
  options: {
    defaultType: "future",
  },
});
const bot = new TelegramBot(envsConfig.token_tele, { polling: true });

let pairState = {} as PAIR_STATE; // State lưu trạng thái

// Load pairState from file if it exists
if (fs.existsSync("pairState.json")) {
  const pairStateData = fs.readFileSync("pairState.json", "utf-8");
  pairState = JSON.parse(pairStateData);
}

// Function to save pairState to file
function savePairStateToFile() {
  const pairStateData = JSON.stringify(pairState);
  fs.writeFileSync("pairState.json", pairStateData, "utf-8");
}
function saveSLTPToFile(slNumber, tpNumber) {
  const data = JSON.stringify({ slNumber, tpNumber });
  fs.writeFileSync("sltp.json", data, "utf-8");
}
function canCallAgain(symbol) {
  if (pairState[symbol]) {
    const { state, sl, time } = pairState[symbol];
    const endTime = new Date() as any;
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
  if (fs.existsSync("sltp.json")) {
    const data = fs.readFileSync("sltp.json", "utf-8");
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
async function handleSLTPTriggers(symbol, result) {
  // Kiểm tra trạng thái của cặp giao dịch
  if (pairState[symbol]) {
    const { state, entry, sl, tp, time } = pairState[symbol];
    const endTime = new Date() as any;
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
    bot.sendMessage(envsConfig.chat_id, message);
    if (result === "Stoploss ❌") {
      slNumber += 1;
       pairState[symbol].state = "SL";
       savePairStateToFile();
    } else if (result === "Take Profit ✅") tpNumber += 1;
    // Reset trạng thái của cặp giao dịch
    delete pairState[symbol];
    savePairStateToFile();
    saveSLTPToFile(slNumber, tpNumber);
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
      const timeframe = "1h"; // Khung thời gian H1
      // Kiểm tra cặp giao dịch có tiền tệ là USDT
      if (quoteCurrency !== "USDT") {
        continue; // Bỏ qua cặp giao dịch không liên quan đến USDT
      }
      // Lấy dữ liệu giá cả từ sàn giao dịch cho từng cặp giao dịch (coin)
      const candles = await exchange.fetchOHLCV(symbol, timeframe);

      if (!candles) continue;
      // Tính toán Bollinger Bands

      const bollingerBands = calculateBollingerBands(
        candles,
        initCaculate.pollingerBandPeriod,
        initCaculate.stdDevMultiplier
      );

      // Xác định điểm vào giao dịch dựa trên Bollinger Bands
      const lastCandle = candles[candles.length - 1];
      const lastClose = lastCandle[4]; // Giá đóng cửa gần nhất
      const upperBand =
        bollingerBands.upperBand[bollingerBands.upperBand.length - 1];
      const lowerBand =
        bollingerBands.lowerBand[bollingerBands.lowerBand.length - 1];

      /// Tính toán RSI
      const closePrices = candles.map((candle) => candle[4]); // Mảng giá đóng cửa
      const rsiValues = calculateRSI(closePrices, initCaculate.rsiPeriod);
      const lastRSI = rsiValues[rsiValues.length - 1];

      // Tính toán MACD
      const macdValues = calculateMACD(
        candles,
        initCaculate.macdShortPeriod,
        initCaculate.macdLongPeriod,
        initCaculate.macdSignalPeriod
      );
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
        } else if (state === "short" && (lastPrice >= sl || lastPrice <= tp)) {
          const result = lastPrice >= sl ? "Stoploss ❌" : "Take Profit ✅";
          handleSLTPTriggers(symbol, result);
        }
      } else {
        if (
          lastClose > upperBand &&
          lastRSI > 70 &&
          lastMACD.histogram > 0 &&
          lastMACD.macd > lastMACD.signal
        ) {
          const entryPrice = lastClose;
          const { stopLoss, takeProfit } = calculateShortSLTP(entryPrice);
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
          bot.sendMessage(envsConfig.chat_id, message);

          console.log(`Điểm short (bán) giao dịch ${symbol}`);
          console.log(`Entry Price: ${entryPrice}`);
          console.log(`Stop Loss: ${stopLoss}`);
          console.log(`Take Profit: ${takeProfit}`);
        } else if (
          lastClose < lowerBand &&
          lastRSI < 30 &&
          lastMACD.histogram < 0 &&
          lastMACD.macd < lastMACD.signal
        ) {
          const entryPrice = lastClose;
          const { stopLoss, takeProfit } = calculateLongSLTP(entryPrice);
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
          bot.sendMessage(envsConfig.chat_id, message);

          console.log(`Điểm long (mua) giao dịch ${symbol}`);
          console.log(`Entry Price: ${entryPrice}`);
          console.log(`Stop Loss: ${stopLoss}`);
          console.log(`Take Profit: ${takeProfit}`);
        }
      }
    }
    savePairStateToFile();
  } catch (error) {
    console.log("có lỗi xảy ra", error);
  }
}
async function runOnce() {
  try {
    await runTradingStrategy();
  } catch (error) {
    console.error("Đã xảy ra lỗi:", error);
  }
}
export default runOnce;
