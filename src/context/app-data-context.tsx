// @ts-nocheck
"use client";

import * as React from "react";
import {
  Region,
  Substation,
  Equipment,
  JobCard,
  ServiceRequest,
  InventoryItem,
  NotificationItem,
  User,
} from "@/types";

interface AppData {
  regions: Region[];
  substations: Substation[];
  equipment: Equipment[];
  inventory: InventoryItem[];
  jobCards: JobCard[];
  serviceRequests: ServiceRequest[];
  notifications: NotificationItem[];
  users: User[];
}

const emptyData: AppData = {
  regions: [],
  substations: [],
  equipment: [],
  inventory: [],
  jobCards: [],
  serviceRequests: [],
  notifications: [],
  users: [],
};

type Setter<K extends keyof AppData> = React.Dispatch<React.SetStateAction<AppData[K]>>;

interface AppDataContextValue extends AppData {
  setRegions: Setter<"regions">;
  setSubstations: Setter<"substations">;
  setEquipment: Setter<"equipment">;
  setInventory: Setter<"inventory">;
  setJobCards: Setter<"jobCards">;
  setServiceRequests: Setter<"serviceRequests">;
  setNotifications: Setter<"notifications">;
  setUsers: Setter<"users">;
  addNotification: (n: Omit<NotificationItem, "id" | "date" | "read">) => void;
  ready: boolean;
}

const AppDataContext = React.createContext<AppDataContextValue | null>(null);

const STORAGE_KEY = "ktpcl-simms-data";

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = React.useState<AppData>(emptyData);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setData({ ...emptyData, ...JSON.parse(raw) });
    } catch {
      // ignore corrupt storage
    }
    setReady(true);
  }, []);

  React.useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, ready]);

  const makeSetter = <K extends keyof AppData>(key: K): Setter<K> =>
    ((update: React.SetStateAction<AppData[K]>) => {
      setData((prev) => ({
        ...prev,
        [key]: typeof update === "function" ? (update as (p: AppData[K]) => AppData[K])(prev[key]) : update,
      }));
    }) as Setter<K>;

  const addNotification: AppDataContextValue["addNotification"] = (n) => {
    setData((prev) => ({
      ...prev,
      notifications: [
        { ...n, id: `n-${Date.now()}`, date: new Date().toISOString(), read: false },
        ...prev.notifications,
      ],
    }));
  };

  const value: AppDataContextValue = {
    ...data,
    setRegions: makeSetter("regions"),
    setSubstations: makeSetter("substations"),
    setEquipment: makeSetter("equipment"),
    setInventory: makeSetter("inventory"),
    setJobCards: makeSetter("jobCards"),
    setServiceRequests: makeSetter("serviceRequests"),
    setNotifications: makeSetter("notifications"),
    setUsers: makeSetter("users"),
    addNotification,
    ready,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = React.useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
