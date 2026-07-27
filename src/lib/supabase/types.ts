export type Role = "spectrum_admin" | "assistant_engineer";
export type HealthStatus = "healthy" | "service_required" | "replacement_required";
export type JobCardStatus = "open" | "in_progress" | "resolved" | "closed";
export type Priority = "low" | "medium" | "high" | "critical";
export type ServiceRequestStatus = "pending" | "approved" | "in_progress" | "completed" | "rejected";
export type ServiceRequestType = "preventive" | "corrective" | "replacement";
export type ActiveStatus = "active" | "inactive";

export interface Profile {
  id: string;
  role: Role;
  name: string;
  email: string | null;
  mobile: string | null;
  employee_id: string | null;
  substation_id: string | null;
  region_id: string | null;
  status: ActiveStatus;
  created_at: string;
}

export interface DbRegion {
  id: string;
  name: string;
  status: ActiveStatus;
  created_at: string;
}

export interface DbSubstation {
  id: string;
  code: string;
  name: string;
  region_id: string;
  address: string | null;
  assistant_engineer_id: string | null;
  status: ActiveStatus;
  created_at: string;
}

export interface DbEquipment {
  id: string;
  name: string;
  category: string;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  substation_id: string;
  installation_date: string | null;
  warranty_until: string | null;
  status: HealthStatus;
  created_at: string;
}

export interface DbComponent {
  id: string;
  name: string;
  equipment_id: string;
  min_qty: number;
  status: ActiveStatus;
  created_at: string;
}

export interface DbInventory {
  id: string;
  component_id: string;
  substation_id: string;
  available_qty: number;
  min_qty: number;
  unit: string;
  updated_by: string | null;
  updated_at: string;
}

export interface DbJobCard {
  id: string;
  job_card_number: string;
  substation_id: string;
  equipment_id: string | null;
  component: string | null;
  issue_description: string;
  priority: Priority;
  status: JobCardStatus;
  remarks: string | null;
  raised_by: string | null;
  created_at: string;
}

export interface DbServiceRequest {
  id: string;
  request_number: string;
  substation_id: string;
  equipment_id: string | null;
  type: ServiceRequestType;
  status: ServiceRequestStatus;
  requested_by: string | null;
  created_at: string;
}

export interface DbNotification {
  id: string;
  title: string;
  description: string | null;
  type: "job_card" | "service_request" | "inventory" | "system";
  target_role: Role | null;
  substation_id: string | null;
  read: boolean;
  created_at: string;
}

// Loose Database type — keeps @supabase/ssr generics happy without
// hand-writing the full generated schema.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
