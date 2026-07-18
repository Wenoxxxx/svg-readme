// ─── Types ────────────────────────────────────────────────────────────────────

/** Matches the Prisma Layer model on the backend */
export type ApiLayer = {
  id: string;
  projectId: string;
  name: string;
  orderIndex: number;
  isLocked: boolean;
  isVisible: boolean;
};

/** Frontend-friendly layer shape (used by LayerPanel / EditorSidebar) */
export type LayerType = {
  id: string;
  name: string;
  type: string; // UI only – not persisted yet, reserved for Element types
  locked: boolean;
  visible: boolean;
  active?: boolean;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const API_BASE = "http://localhost:3001/api";

const handleResponse = async <T>(res: Response): Promise<T> => {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
};

// ─── Layers ──────────────────────────────────────────────────────────────────

/** GET /api/projects/:projectId/layers */
export const getLayers = async (projectId: string): Promise<ApiLayer[]> => {
  const res = await fetch(`${API_BASE}/projects/${projectId}/layers`);
  return handleResponse<ApiLayer[]>(res);
};

/** POST /api/projects/:projectId/layers */
export const createLayer = async (
  projectId: string,
  payload: { id?: string; name: string; orderIndex?: number },
): Promise<ApiLayer> => {
  const res = await fetch(`${API_BASE}/projects/${projectId}/layers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<ApiLayer>(res);
};

/** PUT /api/projects/:projectId/layers/:id */
export const updateLayer = async (
  projectId: string,
  id: string,
  updates: Partial<
    Pick<ApiLayer, "name" | "isLocked" | "isVisible" | "orderIndex">
  >,
): Promise<ApiLayer> => {
  const res = await fetch(`${API_BASE}/projects/${projectId}/layers/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  return handleResponse<ApiLayer>(res);
};

/** DELETE /api/projects/:projectId/layers/:id */
export const deleteLayer = async (
  projectId: string,
  id: string,
): Promise<void> => {
  const res = await fetch(`${API_BASE}/projects/${projectId}/layers/${id}`, {
    method: "DELETE",
  });
  return handleResponse<void>(res);
};

/** PUT /api/projects/:projectId/layers/reorder */
export const reorderLayers = async (
  projectId: string,
  layers: { id: string; orderIndex: number }[],
): Promise<void> => {
  const res = await fetch(`${API_BASE}/projects/${projectId}/layers/reorder`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ layers }),
  });
  return handleResponse<void>(res);
};
