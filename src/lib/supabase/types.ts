export type Role = "spectrum_admin" | "account_executive" | "service_engineer";

export type JobCardStatus =
  | "quotation_shared"
  | "order_received"
  | "offer_dropped"
  | "order_lost"
  | "supply_service_given"
  | "bills_submitted"
  | "payment_received";

export type Priority = "low" | "medium" | "high" | "critical";
export type ActiveStatus = "active" | "inactive";

export interface DbProfile {
  id: string;
  role: Role;
  name: string;
  email: string | null;
  mobile: string | null;
  employee_id: string | null;
  station_id: string | null;
  status: ActiveStatus;
  created_at: string;
}

export interface DbHierarchyNode {
  id: string;
  name: string;
  code: string | null;
  level: number;
  parent_id: string | null;
  address: string | null;
  status: ActiveStatus;
  created_at: string;
}

export interface DbVoltageClass {
  id: string;
  station_id: string;
  name: string;
  status: ActiveStatus;
  created_at: string;
}

export interface DbEquipmentType {
  id: string;
  voltage_class_id: string;
  name: string;
  status: ActiveStatus;
  created_at: string;
}

export interface DbJobCard {
  id: string;
  job_card_number: string;
  station_id: string;
  voltage_class_id: string | null;
  equipment_type_id: string | null;
  component_description: string | null;
  issue_description: string;
  current_status: JobCardStatus;
  priority: Priority;
  quotation_amount: number | null;
  order_amount: number | null;
  remarks: string | null;
  raised_by: string | null;
  assigned_ae: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbJobCardEngineer {
  job_card_id: string;
  engineer_id: string;
  assigned_at: string;
}

export interface DbStatusHistory {
  id: string;
  job_card_id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string | null;
  note: string | null;
  created_at: string;
}

export interface DbMomLog {
  id: string;
  job_card_id: string;
  content: string;
  attachment_path: string | null;
  logged_by: string | null;
  created_at: string;
}

export interface DbNotification {
  id: string;
  job_card_id: string | null;
  title: string;
  body: string | null;
  target_role: Role | null;
  target_user_id: string | null;
  read: boolean;
  created_at: string;
}

export interface DbAppSettings {
  key: string;
  value: string;
  updated_at: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
