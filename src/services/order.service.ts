import { orderMarketWithSLTP } from "../controllers/OrderMarket";
import { Request, Response } from 'express'
const OrderService = async (req: Request, res: Response) => {
    try {
        const { symbol, side, quantity, stopPrice, takeProfitPrice } = req.body
        await orderMarketWithSLTP(symbol, side, quantity, stopPrice, takeProfitPrice)
    } catch (error) {
        console.log(error);
        return res.status(400).json({
            msg: error
        })
    }
}
export {
    OrderService
}