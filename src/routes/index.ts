import express from 'express';
import { OrderService } from '../services/order.service';


const router = express.Router();

router.post('/order_market', OrderService)

export { router };