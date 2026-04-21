export type CafesStackParamList = {
  CafesList: undefined;
  CafeDetails: { id: string; title?: string };
  CafeReviews: { cafeId: string; cafeName?: string };
  ReviewCreate: { cafeId: string; cafeName?: string };
};

export type BookingsStackParamList = {
  BookingsList: undefined;
  BookingDetails: { id: string; title?: string };
  OrderFromBooking: { appointmentId: string; cafeId: string; cafeName?: string };
  OrderChat: { orderId: string; cafeName?: string; cafeLogo?: string };
};

