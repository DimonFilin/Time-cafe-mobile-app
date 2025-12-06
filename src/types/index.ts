export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Cafe {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  photos?: string[];
  description?: string;
  rating?: number;
  reviewsCount?: number;
}

export interface Booking {
  id: string;
  cafeId: string;
  userId: string;
  dateTime: Date;
  duration: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  qrCode?: string;
}

export interface Wallet {
  balance: number;
  transactions: Transaction[];
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'payment' | 'refund';
  amount: number;
  description: string;
  createdAt: Date;
}




