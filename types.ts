
export enum UserRole {
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  MEMBER = 'MEMBER'
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  avatarUrl?: string;
  bandIds: string[];
}

export interface BandMember extends User {
  role: UserRole;
}

export interface ItemVariant {
  label: string; // "S", "M", "L", "Universal"
  stock: number;
}

export interface Item {
  id: string;
  name: string;
  price: number;
  variants: ItemVariant[]; // Replaces single stock
  imageUrl?: string;
}

export interface SaleItem {
  itemId: string;
  variantLabel: string;
  quantity: number;
  priceAtSale: number;
  name: string;
}

export interface Sale {
  id: string;
  items: SaleItem[];
  total: number;
  timestamp: string; // ISO String
  sellerId: string;
  sellerName: string;
}

export interface Band {
  id: string;
  name: string;
  imageUrl?: string;
  paymentQrUrl?: string; // New field for Payment QR Code
  paymentPhoneNumber?: string; // New field for Payment Phone Number
  showPaymentQr?: boolean; // New toggle
  showPaymentPhone?: boolean; // New toggle
  joinCode: string;
  members: BandMember[];
  inventory: Item[];
  sales: Sale[];
  pendingRequests: User[];
}

export interface CartItem extends Item {
  selectedVariant: string;
  quantity: number;
}
