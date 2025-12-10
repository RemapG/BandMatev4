
export enum UserRole {
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  BAND_MEMBER = 'BAND_MEMBER', // New role: Full project access
  MEMBER = 'MEMBER' // Salesperson (Restricted)
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  avatarUrl?: string;
  description?: string; // Bio/Description
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
  description?: string; 
  imageUrl?: string;
  paymentQrUrl?: string; 
  paymentPhoneNumber?: string; 
  paymentRecipientName?: string; 
  showPaymentQr?: boolean; 
  showPaymentPhone?: boolean; 
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

// --- PROJECT MANAGEMENT TYPES ---

export type ProjectType = 'SONG' | 'EVENT' | 'REHEARSAL';

export interface Comment {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: string; // ISO String
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  isCompleted: boolean;
  linkUrl?: string;
  sortOrder?: number;
  createdAt?: string;
}

export interface Project {
  id: string;
  bandId: string;
  title: string;
  type: ProjectType;
  status: 'IN_PROGRESS' | 'COMPLETED';
  date?: string; // ISO Date (YYYY-MM-DD)
  startTime?: string; // HH:MM string
  location?: string; // Venue name or address
  description?: string; // Extra info
  tasks: Task[];
  comments?: Comment[]; // Optional, fetched separately mostly
  createdAt: string;
}