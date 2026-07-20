export type Department = "KITCHEN" | "BAR";
export type TableStatus = "FREE" | "BUSY" | "RESERVED" | "CLEANING";
export type ItemStatus = "NEW" | "COOKING" | "READY";
export type OrderStatus = "NEW" | "IN_PROGRESS" | "READY" | "SERVED" | "CANCELED";
export type OrderType = "DINE_IN" | "DELIVERY";
export type DeliveryStatus = "NEW" | "CONFIRMED" | "READY_FOR_PICKUP" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELED";
export type PaymentMethod = "CASH" | "CARD" | "TRANSFER";
export type WaiterNotificationType = "WAITER_CALL" | "ORDER_READY" | "TABLE_CLEANING";
export type StaffRole = "ADMIN" | "WAITER" | "KITCHEN" | "BAR";

export type StaffUser = {
  id: string;
  username: string;
  name: string;
  role: StaffRole;
};

export type Category = {
  id: string;
  name: string;
  sortOrder: number;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  department: Department;
  isPaused: boolean;
  isDeleted: boolean;
  categoryId: string;
  category?: Category;
};

export type DiningTable = {
  id: string;
  number: number;
  qrToken: string;
  seats: number;
  status: TableStatus;
  waiterId?: string | null;
  waiter?: StaffUser | null;
};

export type OrderItem = {
  id: string;
  quantity: number;
  price: number;
  status: ItemStatus;
  product: Product;
};

export type Order = {
  id: string;
  number: number;
  orderType: OrderType;
  comment: string;
  status: OrderStatus;
  deliveryStatus?: DeliveryStatus | null;
  totalAmount: number;
  paymentMethod?: PaymentMethod | null;
  waiterPercent: number;
  waiterAmount: number;
  tableId?: string | null;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryEntrance: string;
  deliveryFloor: string;
  deliveryApartment: string;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  driverName: string;
  driverPhone: string;
  shiftId?: string | null;
  closedAt?: string | null;
  closedById?: string | null;
  closedBy?: StaffUser | null;
  createdAt: string;
  table?: DiningTable | null;
  items: OrderItem[];
  review?: CustomerReview | null;
};

export type CustomerReview = {
  id: string;
  rating: number;
  comment: string;
  orderId: string;
  tableId?: string | null;
  waiterId?: string | null;
  createdAt: string;
  order?: Order;
  table?: DiningTable;
  waiter?: StaffUser | null;
};

export type WaiterNotification = {
  id: string;
  type: WaiterNotificationType;
  tableNumber: number;
  title: string;
  message: string;
  waiterId?: string | null;
  createdAt: string;
};

export type DepartmentNotification = {
  id: string;
  department: Department;
  orderId: string | null;
  tableNumber: number;
  title: string;
  message: string;
  createdAt: string;
};

export type RestaurantSettings = {
  id: string;
  waiterPercent: number;
  cleanupMinutes: number;
};

export type CashCount = Record<string, number>;

export type WorkShift = {
  id: string;
  adminId: string;
  openedAt: string;
  closedAt: string | null;
  openingCash: CashCount;
  closingCash: CashCount | null;
  openingTotal: number;
  closingTotal: number | null;
  note: string;
  admin?: StaffUser;
};
