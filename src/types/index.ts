export type Role = "spectrum_admin" | "assistant_engineer";

export type HealthStatus = "healthy" | "service_required" | "replacement_required";

export type JobCardStatus = "open" | "in_progress" | "resolved" | "closed";
export type Priority = "low" | "medium" | "high" | "critical";
export type ServiceRequestStatus = "pending" | "approved" | "in_progress" | "completed" | "rejected";

export interface Region {
  id: string;
  name: string;
  substationCount: number;
  status: "active" | "inactive";
}

export interface Substation {
  id: string;
  code: string;
  name: string;
  regionId: string;
  regionName: string;
  address: string;
  assistantEngineer: string;
  status: "active" | "inactive";
  equipmentCount: number;
  healthScore: number; // 0-100
}

export interface Equipment {
  id: string;
  name: string;
  category: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  substationId: string;
  substationName: string;
  installationDate: string;
  warrantyUntil: string;
  status: HealthStatus;
}

export interface JobCard {
  id: string;
  jobCardNumber: string;
  date: string;
  regionName: string;
  substationName: string;
  equipment: string;
  component: string;
  issueDescription: string;
  priority: Priority;
  status: JobCardStatus;
  raisedBy: string;
}

export interface ServiceRequest {
  id: string;
  requestNumber: string;
  date: string;
  substationName: string;
  equipment: string;
  type: "preventive" | "corrective" | "replacement";
  status: ServiceRequestStatus;
  requestedBy: string;
}

export interface InventoryItem {
  id: string;
  componentName: string;
  equipment: string;
  substationName: string;
  availableQty: number;
  minQty: number;
  unit: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  type: "job_card" | "service_request" | "inventory" | "system";
  date: string;
  read: boolean;
}

export interface User {
  id: string;
  name: string;
  role: Role;
  email: string;
  substationName?: string;
  regionName?: string;
}
