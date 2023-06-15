"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rewardPercentage = exports.riskPercentage = exports.initCaculate = void 0;
exports.initCaculate = {
    rsiPeriod: 20,
    pollingerBandPeriod: 50,
    stdDevMultiplier: 2,
    macdShortPeriod: 12,
    macdLongPeriod: 26,
    macdSignalPeriod: 9
};
// Số ngày trong chu kỳ tính toán
exports.riskPercentage = 0.04; // Tỷ lệ rủi ro 4% (có thể điều chỉnh)
exports.rewardPercentage = 0.04; // Tỷ lệ lợi nhuận 8% (có thể điều chỉnh)
