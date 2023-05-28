import ccxt from 'ccxt';
import { envsConfig } from '../config/envs';


// Khởi tạo API client cho Binance Futures
const exchange = new ccxt.binance({

    apiKey: envsConfig.apiKey,
    secret: envsConfig.secretKey,
    enableRateLimit: true,
    options: {
        defaultType: 'future',
    },
});

const orderMarketWithSLTP = async (symbol, side, quantity, stopPrice, takeProfitPrice) => {
    try {

        // Tạo lệnh Market
        const marketOrder = await exchange.createOrder(
            symbol,
            'market',
            side,
            quantity
        );

        console.log('Đặt lệnh Market thành công:', marketOrder);

        // Tạo lệnh Take Profit
        const takeProfitOrder = await exchange.createOrder(
            symbol,
            'take_profit',
            side === 'buy' ? 'sell' : 'buy',
            quantity,
            undefined,
            {
                stopPrice: takeProfitPrice,
                reduceOnly: true,
            }
        );

        console.log('Đặt lệnh Take Profit thành công:', takeProfitOrder);

        // Tạo lệnh Stop Loss
        const stopLossOrder = await exchange.createOrder(
            symbol,
            'stop',
            side === 'buy' ? 'sell' : 'buy',
            quantity,
            stopPrice,
            {
                reduceOnly: true,
            }
        );

        console.log('Đặt lệnh Stop Loss thành công:', stopLossOrder);

    } catch (error) {
        console.log(error);
    }
};


export {
    orderMarketWithSLTP
}