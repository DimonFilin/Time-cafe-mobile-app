import { sharedApi } from '@/config/api';

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
export type DeliveryType = 'IN_CAFE' | 'TAKEOUT' | 'DELIVERY';
export type PaymentMethod = 'CARD' | 'BALANCE' | 'CASH';

export interface OrderItemResponse {
  id: string;
  itemName: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  notes?: string | null;
}

export interface OrderResponse {
  id: string;
  orderNumber: string;
  cafeId: string;
  cafeName?: string;
  appointmentId?: string | null;
  status: OrderStatus;
  totalAmount: string;
  deliveryType: DeliveryType;
  paymentMethod: PaymentMethod;
  items: OrderItemResponse[];
  user: { firstName: string; lastName: string; phone?: string | null };
  createdAt: string;
  confirmedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
}

export interface OrderListResponse {
  items: OrderResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getMyOrders(params?: {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  cafeId?: string;
  appointmentId?: string;
}): Promise<OrderListResponse> {
  const res = await sharedApi.get<OrderListResponse>('/orders', { params });
  return res.data;
}

export async function getOrderById(orderId: string): Promise<OrderResponse> {
  const res = await sharedApi.get<OrderResponse>(`/orders/${orderId}`);
  return res.data;
}

export interface CreateOrderItemInput {
  itemName: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface CreateOrderInput {
  cafeId: string;
  appointmentId?: string;
  items: CreateOrderItemInput[];
  deliveryType?: DeliveryType;
  deliveryAddress?: string;
  contactPhone: string;
  notes?: string;
  paymentMethod?: PaymentMethod;
  cardId?: string;
}

export async function createOrder(input: CreateOrderInput): Promise<OrderResponse> {
  const res = await sharedApi.post<OrderResponse>('/orders', input);
  return res.data;
}


