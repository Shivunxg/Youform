import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';

export const useWorkspaceStore = create(
  persist(
    (set, get) => ({
      workspaces: [],
      activeWorkspaceId: null,

      get activeWorkspace() {
        return get().workspaces.find(w => w.id === get().activeWorkspaceId) ?? null;
      },

      fetchWorkspaces: async () => {
        const { workspaces } = await api.workspaces.list();
        set({ workspaces });
        if (!get().activeWorkspaceId && workspaces.length > 0) {
          set({ activeWorkspaceId: workspaces[0].id });
        }
        return workspaces;
      },

      setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),

      createWorkspace: async (name) => {
        const { workspace } = await api.workspaces.create({ name });
        set(s => ({ workspaces: [...s.workspaces, workspace], activeWorkspaceId: workspace.id }));
        return workspace;
      },
    }),
    {
      name: 'formflow-workspace',
      partialize: s => ({ activeWorkspaceId: s.activeWorkspaceId }),
    }
  )
);
