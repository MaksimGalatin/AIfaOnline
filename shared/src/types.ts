export type PaymentMethod = "stars" | "nowpayments";
export type OrderStatus =
  | "created" | "awaiting_payment" | "paid"
  | "delivering" | "delivered" | "refunded" | "failed" | "canceled";
export type PrestigeRank = "none" | "spark" | "resonance" | "eternal";
