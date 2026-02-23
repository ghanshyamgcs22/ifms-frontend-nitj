export type UserRole = "admin" | "pi" | "ar" | "dr" | "ao2" | "ao1" | "hod";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
}

export const mockUsers: User[] = [
  {
    id: "1",
    name: "Admin User",
    email: "admin@ifms.edu",
    role: "admin",
  },
  {
    id: "2",
    name: "Dr. John Smith",
    email: "pi@ifms.edu",
    role: "pi",
    department: "Computer Science",
  },
  {
    id: "3",
    name: "Assistant Registrar",
    email: "ar@ifms.edu",
    role: "ar",
  },
  {
    id: "4",
    name: "Deputy Registrar",
    email: "dr@ifms.edu",
    role: "dr",
  },
  {
    id: "5",
    name: "DA Officer",
    email: "da@ifms.edu",
    role: "da",
  },
];

export const login = (email: string, password: string): User | null => {
  const user = mockUsers.find((u) => u.email === email);
  if (user && password === "password123") {
    localStorage.setItem("user", JSON.stringify(user));
    return user;
  }
  return null;
};

export const logout = () => {
  localStorage.removeItem("user");
};

export const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem("user");
  return userStr ? JSON.parse(userStr) : null;
};
