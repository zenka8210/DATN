const mongoose = require('mongoose');

const VoucherSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  discountPercent: { type: Number, required: true, min: 0, max: 100 }, // Giá trị giảm giá
  maximumOrderValue: { type: Number, default: null }, // Giá trị đơn hàng tối đa để áp dụng voucher (null = không giới hạn)
  minimumOrderValue: { type: Number, default: 0 }, // Giá trị đơn hàng tối thiểu để áp dụng voucher
  maximumDiscountAmount: { type: Number, default: 200000 }, // Số tiền giảm tối đa (mặc định 200k)
  startDate: { type: Date, required: true }, // Ngày bắt đầu áp dụng voucher
  endDate: { type: Date, required: true }, // Ngày hết hạn của
  isActive: { type: Boolean, default: true }, // Trạng thái hoạt động của voucher
  usageLimit: { type: Number, default: 1 }, // Số lần tối đa mỗi user có thể sử dụng voucher (default: 1)
  isOneTimePerUser: { type: Boolean, default: true }, // Chỉ cho phép mỗi user sử dụng 1 lần
}, { timestamps: true });

module.exports = mongoose.model('Voucher', VoucherSchema);
