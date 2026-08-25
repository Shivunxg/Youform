// @ts-nocheck
import {
  Region,
  Substation,
  Equipment,
  JobCard,
  ServiceRequest,
  InventoryItem,
  NotificationItem,
} from "@/types";

export const regions: Region[] = [
  { id: "r1", name: "Bangalore North", substationCount: 8, status: "active" },
  { id: "r2", name: "Bangalore South", substationCount: 6, status: "active" },
  { id: "r3", name: "Mysore", substationCount: 5, status: "active" },
  { id: "r4", name: "Hubli", substationCount: 4, status: "active" },
  { id: "r5", name: "Mangalore", substationCount: 3, status: "active" },
];

export const substations: Substation[] = [
  { id: "s1", code: "SS-BLR-014", name: "Yelahanka 110kV SS", regionId: "r1", regionName: "Bangalore North", address: "Yelahanka, Bengaluru", assistantEngineer: "Ramesh Gowda", status: "active", equipmentCount: 22, healthScore: 88 },
  { id: "s2", code: "SS-BLR-021", name: "Hebbal 66kV SS", regionId: "r1", regionName: "Bangalore North", address: "Hebbal, Bengaluru", assistantEngineer: "Priya Nair", status: "active", equipmentCount: 18, healthScore: 74 },
  { id: "s3", code: "SS-BLR-009", name: "Jayanagar 110kV SS", regionId: "r2", regionName: "Bangalore South", address: "Jayanagar, Bengaluru", assistantEngineer: "Suresh Kumar", status: "active", equipmentCount: 25, healthScore: 92 },
  { id: "s4", code: "SS-BLR-017", name: "Electronic City SS", regionId: "r2", regionName: "Bangalore South", address: "Electronic City, Bengaluru", assistantEngineer: "Anitha Rao", status: "active", equipmentCount: 20, healthScore: 65 },
  { id: "s5", code: "SS-MYS-003", name: "Mysore Palace Road SS", regionId: "r3", regionName: "Mysore", address: "Palace Road, Mysore", assistantEngineer: "Manjunath H.S.", status: "active", equipmentCount: 16, healthScore: 81 },
  { id: "s6", code: "SS-HUB-006", name: "Hubli Industrial SS", regionId: "r4", regionName: "Hubli", address: "Industrial Area, Hubli", assistantEngineer: "Vinay Patil", status: "active", equipmentCount: 19, healthScore: 58 },
  { id: "s7", code: "SS-MNG-002", name: "Mangalore Port SS", regionId: "r5", regionName: "Mangalore", address: "Port Road, Mangalore", assistantEngineer: "Deepak Shetty", status: "active", equipmentCount: 14, healthScore: 95 },
];

export const equipment: Equipment[] = [
  { id: "e1", name: "Power Transformer T1", category: "Transformer", manufacturer: "BHEL", model: "PT-40MVA", serialNumber: "BHEL-2019-4471", substationId: "s1", substationName: "Yelahanka 110kV SS", installationDate: "2019-03-12", warrantyUntil: "2026-03-12", status: "healthy" },
  { id: "e2", name: "Relay Panel RP-2", category: "Relay Panel", manufacturer: "Siemens", model: "SIPROTEC 7SJ82", serialNumber: "SIE-2020-1182", substationId: "s2", substationName: "Hebbal 66kV SS", installationDate: "2020-07-01", warrantyUntil: "2025-07-01", status: "service_required" },
  { id: "e3", name: "Battery Bank B1", category: "Battery Bank", manufacturer: "Exide", model: "EX-220V-200AH", serialNumber: "EXD-2018-9021", substationId: "s4", substationName: "Electronic City SS", installationDate: "2018-11-20", warrantyUntil: "2023-11-20", status: "replacement_required" },
  { id: "e4", name: "Circuit Breaker CB-4", category: "Circuit Breaker", manufacturer: "ABB", model: "SF6-145kV", serialNumber: "ABB-2021-3345", substationId: "s3", substationName: "Jayanagar 110kV SS", installationDate: "2021-01-15", warrantyUntil: "2027-01-15", status: "healthy" },
  { id: "e5", name: "Lightning Arrester LA-1", category: "Lightning Arrester", manufacturer: "Crompton Greaves", model: "LA-132kV", serialNumber: "CG-2017-7743", substationId: "s6", substationName: "Hubli Industrial SS", installationDate: "2017-05-09", warrantyUntil: "2024-05-09", status: "replacement_required" },
  { id: "e6", name: "Control Panel CP-1", category: "Control Panel", manufacturer: "L&T", model: "LT-CP-500", serialNumber: "LT-2022-5561", substationId: "s5", substationName: "Mysore Palace Road SS", installationDate: "2022-02-18", warrantyUntil: "2028-02-18", status: "healthy" },
  { id: "e7", name: "CT Unit CT-3", category: "CT", manufacturer: "Siemens", model: "SI-CT-220", serialNumber: "SIE-2019-6620", substationId: "s2", substationName: "Hebbal 66kV SS", installationDate: "2019-09-25", warrantyUntil: "2025-09-25", status: "service_required" },
  { id: "e8", name: "PT Unit PT-2", category: "PT", manufacturer: "ABB", model: "AB-PT-110", serialNumber: "ABB-2020-8834", substationId: "s7", substationName: "Mangalore Port SS", installationDate: "2020-04-10", warrantyUntil: "2026-04-10", status: "healthy" },
];

export const jobCards: JobCard[] = [
  { id: "jc1", jobCardNumber: "JC-2026-0142", date: "2026-07-24", regionName: "Bangalore North", substationName: "Hebbal 66kV SS", equipment: "Relay Panel RP-2", component: "Protection Relay", issueDescription: "Relay tripping intermittently during load fluctuation", priority: "high", status: "open", raisedBy: "Priya Nair" },
  { id: "jc2", jobCardNumber: "JC-2026-0141", date: "2026-07-23", regionName: "Bangalore South", substationName: "Electronic City SS", equipment: "Battery Bank B1", component: "Battery Cell", issueDescription: "Voltage drop below threshold on 4 cells", priority: "critical", status: "in_progress", raisedBy: "Anitha Rao" },
  { id: "jc3", jobCardNumber: "JC-2026-0140", date: "2026-07-22", regionName: "Hubli", substationName: "Hubli Industrial SS", equipment: "Lightning Arrester LA-1", component: "Arrester Unit", issueDescription: "Surge counter reading abnormal, insulation aging", priority: "critical", status: "open", raisedBy: "Vinay Patil" },
  { id: "jc4", jobCardNumber: "JC-2026-0139", date: "2026-07-21", regionName: "Bangalore North", substationName: "Yelahanka 110kV SS", equipment: "Power Transformer T1", component: "Cooling Fan", issueDescription: "Cooling fan making abnormal noise, reduced airflow", priority: "medium", status: "resolved", raisedBy: "Ramesh Gowda" },
  { id: "jc5", jobCardNumber: "JC-2026-0138", date: "2026-07-19", regionName: "Mysore", substationName: "Mysore Palace Road SS", equipment: "Control Panel CP-1", component: "Indicator Lamp", issueDescription: "Status indicator lamp not functioning", priority: "low", status: "closed", raisedBy: "Manjunath H.S." },
  { id: "jc6", jobCardNumber: "JC-2026-0137", date: "2026-07-18", regionName: "Bangalore North", substationName: "Hebbal 66kV SS", equipment: "CT Unit CT-3", component: "Connector", issueDescription: "Loose terminal connector causing minor arcing", priority: "medium", status: "in_progress", raisedBy: "Priya Nair" },
];

export const serviceRequests: ServiceRequest[] = [
  { id: "sr1", requestNumber: "SR-2026-0089", date: "2026-07-24", substationName: "Electronic City SS", equipment: "Battery Bank B1", type: "replacement", status: "pending", requestedBy: "Anitha Rao" },
  { id: "sr2", requestNumber: "SR-2026-0088", date: "2026-07-23", substationName: "Hubli Industrial SS", equipment: "Lightning Arrester LA-1", type: "replacement", status: "approved", requestedBy: "Vinay Patil" },
  { id: "sr3", requestNumber: "SR-2026-0087", date: "2026-07-21", substationName: "Hebbal 66kV SS", equipment: "Relay Panel RP-2", type: "corrective", status: "in_progress", requestedBy: "Priya Nair" },
  { id: "sr4", requestNumber: "SR-2026-0086", date: "2026-07-17", substationName: "Yelahanka 110kV SS", equipment: "Power Transformer T1", type: "preventive", status: "completed", requestedBy: "Ramesh Gowda" },
  { id: "sr5", requestNumber: "SR-2026-0085", date: "2026-07-15", substationName: "Jayanagar 110kV SS", equipment: "Circuit Breaker CB-4", type: "preventive", status: "completed", requestedBy: "Suresh Kumar" },
];

export const inventory: InventoryItem[] = [
  { id: "i1", componentName: "Cooling Fan", equipment: "Power Transformer T1", substationName: "Yelahanka 110kV SS", availableQty: 2, minQty: 3, unit: "Nos" },
  { id: "i2", componentName: "Protection Relay", equipment: "Relay Panel RP-2", substationName: "Hebbal 66kV SS", availableQty: 1, minQty: 2, unit: "Nos" },
  { id: "i3", componentName: "Battery Cell 220V", equipment: "Battery Bank B1", substationName: "Electronic City SS", availableQty: 4, minQty: 10, unit: "Nos" },
  { id: "i4", componentName: "Fuse 6A", equipment: "Control Panel CP-1", substationName: "Mysore Palace Road SS", availableQty: 45, minQty: 20, unit: "Nos" },
  { id: "i5", componentName: "Arrester Unit 132kV", equipment: "Lightning Arrester LA-1", substationName: "Hubli Industrial SS", availableQty: 0, minQty: 2, unit: "Nos" },
  { id: "i6", componentName: "Terminal Connector", equipment: "CT Unit CT-3", substationName: "Hebbal 66kV SS", availableQty: 60, minQty: 25, unit: "Nos" },
];

export const notifications: NotificationItem[] = [
  { id: "n1", title: "Critical Job Card Raised", description: "JC-2026-0140 raised at Hubli Industrial SS — Lightning Arrester", type: "job_card", date: "2026-07-27T08:10:00", read: false },
  { id: "n2", title: "Replacement Request Pending", description: "SR-2026-0089 awaiting approval — Battery Bank, Electronic City SS", type: "service_request", date: "2026-07-27T07:40:00", read: false },
  { id: "n3", title: "Low Stock Alert", description: "Arrester Unit 132kV is out of stock at Hubli Industrial SS", type: "inventory", date: "2026-07-26T16:05:00", read: false },
  { id: "n4", title: "Preventive Maintenance Completed", description: "SR-2026-0086 completed at Yelahanka 110kV SS", type: "service_request", date: "2026-07-25T11:20:00", read: true },
  { id: "n5", title: "Job Card Resolved", description: "JC-2026-0139 marked resolved at Yelahanka 110kV SS", type: "job_card", date: "2026-07-24T14:50:00", read: true },
];

export const inventoryDistribution = [
  { region: "Blr North", value: 320 },
  { region: "Blr South", value: 285 },
  { region: "Mysore", value: 190 },
  { region: "Hubli", value: 140 },
  { region: "Mangalore", value: 110 },
];

export const maintenanceTrend = [
  { month: "Feb", preventive: 18, corrective: 9 },
  { month: "Mar", preventive: 22, corrective: 11 },
  { month: "Apr", preventive: 19, corrective: 14 },
  { month: "May", preventive: 25, corrective: 8 },
  { month: "Jun", preventive: 28, corrective: 12 },
  { month: "Jul", preventive: 24, corrective: 16 },
];

export const equipmentHealthDistribution = [
  { name: "Healthy", value: 68, color: "#22C55E" },
  { name: "Service Required", value: 21, color: "#F59E0B" },
  { name: "Replacement Required", value: 11, color: "#EF4444" },
];

export const kpis = {
  totalRegions: regions.length,
  totalSubstations: substations.reduce((a, s) => a + 1, 0),
  totalEquipment: 214,
  totalComponents: 862,
  availableInventory: 5420,
  lowStockItems: inventory.filter((i) => i.availableQty < i.minQty).length,
  openJobCards: jobCards.filter((j) => j.status === "open" || j.status === "in_progress").length,
  pendingServices: serviceRequests.filter((s) => s.status === "pending" || s.status === "in_progress").length,
  completedServices: serviceRequests.filter((s) => s.status === "completed").length,
  replacementRequests: serviceRequests.filter((s) => s.type === "replacement").length,
  upcomingMaintenance: 9,
};
