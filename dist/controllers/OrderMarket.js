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
exports.orderMarketWithSLTP = void 0;
const ccxt_1 = __importDefault(require("ccxt"));
const envs_1 = require("../config/envs");
// Khởi tạo API client cho Binance Futures
const exchange = new ccxt_1.default.binance({
    apiKey: envs_1.envsConfig.apiKey,
    secret: envs_1.envsConfig.secretKey,
    enableRateLimit: true,
    options: {
        defaultType: 'future',
    },
});
const orderMarketWithSLTP = (symbol, side, quantity, stopPrice, takeProfitPrice) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Tạo lệnh Market
        const marketOrder = yield exchange.createOrder(symbol, 'market', side, quantity);
        console.log('Đặt lệnh Market thành công:', marketOrder);
        // Tạo lệnh Take Profit
        const takeProfitOrder = yield exchange.createOrder(symbol, 'take_profit', side === 'buy' ? 'sell' : 'buy', quantity, undefined, {
            stopPrice: takeProfitPrice,
            reduceOnly: true,
        });
        console.log('Đặt lệnh Take Profit thành công:', takeProfitOrder);
        // Tạo lệnh Stop Loss
        const stopLossOrder = yield exchange.createOrder(symbol, 'stop', side === 'buy' ? 'sell' : 'buy', quantity, stopPrice, {
            reduceOnly: true,
        });
        console.log('Đặt lệnh Stop Loss thành công:', stopLossOrder);
    }
    catch (error) {
        console.log(error);
    }
});
exports.orderMarketWithSLTP = orderMarketWithSLTP;
