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

export interface HierarchyNode {
  id: string;
  name: string;
  code: string | null;
  level: 1 | 2 | 3 | 4;
  parentId: string | null;
  address: string | null;
  status: ActiveStatus;
  createdAt: string;
}

export interface VoltageClass {
  id: string;
  stationId: string;
  name: string;
  status: ActiveStatus;
}

export interface EquipmentType {
  id: string;
  voltageClassId: string;
  name: string;
  status: ActiveStatus;
}

export interface JobCard {
  id: string;
  jobCardNumber: string;
  stationId: string;
  stationName: string;
  voltageClassName: string | null;
  equipmentTypeName: string | null;
  componentDescription: string | null;
  issueDescription: string;
  currentStatus: JobCardStatus;
  priority: Priority;
  quotationAmount: number | null;
  orderAmount: number | null;
  remarks: string | null;
  raisedBy: string | null;
  assignedAe: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StatusHistoryEntry {
  id: string;
  jobCardId: string;
  fromStatus: string | null;
  toStatus: string;
  changedBy: string | null;
  note: string | null;
  createdAt: string;
}

export interface MomLog {
  id: string;
  jobCardId: string;
  content: string;
  attachmentPath: string | null;
  loggedBy: string | null;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  targetRole: Role | null;
  targetUserId: string | null;
  jobCardId: string | null;
  read: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  role: Role;
  email: string | null;
  mobile: string | null;
  employeeId: string | null;
  stationId: string | null;
  status: ActiveStatus;
}

export interface AppSettings {
  level1Label: string;
  level2Label: string;
  level3Label: string;
  level4Label: string;
  ageingThresholdDays: number;
}
