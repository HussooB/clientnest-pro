export type Role = 'Admin' | 'Finance' | 'Support' | 'Sales';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status?: 'Active' | 'Inactive' | 'Suspended';
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Lost';
  assignedTo?: string;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  company?: string;
  status: 'Active' | 'Inactive' | 'Churned';
  assignedTo?: string;
  createdAt: string;
}

export interface License {
  id: string;
  clientId: string;
  productId: string;
  status: 'Active' | 'Expired' | 'Cancelled';
  validFrom: string;
  validUntil: string;
  seatCount: number;
}

export interface Invoice {
  id: string;
  clientId: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Cancelled';
  dueDate: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  clientId: string;
  subject: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  assignedTo?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}
