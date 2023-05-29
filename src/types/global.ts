export interface PAIR_STATE {
    [symbol: string]: {
        state: string;
        entry: number;
        sl: number;
        tp: number;
        time: any;
        
    };
}