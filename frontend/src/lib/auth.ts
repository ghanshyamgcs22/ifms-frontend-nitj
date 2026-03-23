// lib/auth.ts
// Central auth — add new DRC chain users here

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role:
    | "admin"
    | "pi"
    | "da"
    | "ar"
    | "dr"
    | "drc_office"
    | "drc_rc"
    | "drc"
    | "director";
}

// ── All users ────────────────────────────────────────────────────────────────
const USERS: User[] = [
  // ── Existing ──
  {
    id: "1",
    name: "Admin User",
    email: "admin@ifms.edu",
    password: "password123",
    role: "admin",
  },
  {
    id: "2",
    name: "Principal Investigator",
    email: "pi@ifms.edu",
    password: "password123",
    role: "pi",
  },
  {
    id: "3",
    name: "Dealing Assistant",
    email: "da@ifms.edu",
    password: "password123",
    role: "da",
  },
  {
    id: "4",
    name: "Assistant Registrar",
    email: "ar@ifms.edu",
    password: "password123",
    role: "ar",
  },
  {
    id: "5",
    name: "Deputy Registrar",
    email: "dr@ifms.edu",
    password: "password123",
    role: "dr",
  },

  // ── New: DRC chain (> ₹25k) ──
  {
    id: "6",
    name: "DRC Office",
    email: "drc.office@ifms.edu",
    password: "password123",
    role: "drc_office",
  },
  {
    id: "7",
    name: "DRC Research & Committee",
    email: "drc.rc@ifms.edu",
    password: "password123",
    role: "drc_rc",
  },
  {
    id: "8",
    name: "DRC",
    email: "drc@ifms.edu",
    password: "password123",
    role: "drc",
  },
  {
    id: "9",
    name: "Director",
    email: "director@ifms.edu",
    password: "password123",
    role: "director",
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const SESSION_KEY = "ifms_user";

export function login(email: string, password: string): User | null {
  const user = USERS.find(
    (u) =>
      u.email.toLowerCase() === email.toLowerCase().trim() &&
      u.password === password
  );
  if (user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  }
  return null;
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function getCurrentUser(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}
