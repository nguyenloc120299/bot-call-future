import express from 'express';
import * as dotenv from 'dotenv'
dotenv.config()
import { envsConfig } from './config/envs';
import cors from 'cors'
import { router } from './routes/index';
import runOnce from './utils/bot';
import morgan from 'morgan';
import bodyParser from 'body-parser';


const app = express();
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use('/api', router);
app.use(bodyParser.urlencoded({ extended: true }));

const port = 3000;



app.listen(envsConfig.PORT, async () => {
    console.log(`Server is listening on port ${port}`);
    setInterval(runOnce, 60000 * 2);
});