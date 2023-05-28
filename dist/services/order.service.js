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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderService = void 0;
const OrderMarket_1 = require("../controllers/OrderMarket");
const OrderService = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { symbol, side, quantity, stopPrice, takeProfitPrice } = req.body;
        yield (0, OrderMarket_1.orderMarketWithSLTP)(symbol, side, quantity, stopPrice, takeProfitPrice);
    }
    catch (error) {
        console.log(error);
        return res.status(400).json({
            msg: error
        });
    }
});
exports.OrderService = OrderService;
