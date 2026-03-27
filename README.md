# IFMS - Institute Financial Management System

A comprehensive web-based financial management system designed for educational institutions to streamline budget requests, approvals, and tracking through a multi-level workflow.

## 📋 Overview

IFMS is a modern, role-based financial management platform that automates the budget approval process through a structured 5-stage workflow. The system ensures transparency, accountability, and efficient tracking of financial requests from creation to final approval.

## ✨ Key Features

### Multi-Level Approval Workflow
- **5-Stage Approval Pipeline**: PI → Admin → AR → DR → AO2
- **Real-time Status Tracking**: Monitor requests at every stage
- **Rejection Handling**: Requests can be rejected at any stage with comments
- **Approval Timeline**: Visual timeline showing the complete approval history

### Role-Based Dashboards
- **PI (Principal Investigator)**: Create and manage budget requests
- **Admin**: Review and approve/reject PI submissions
- **AR (Assistant Registrar)**: Process admin-approved requests
- **DR (Deputy Registrar)**: Review AR-approved requests
- **AO2 (Accounts Officer)**: Final approval authority

### Budget Management
- **Project Creation**: Admins can create and manage projects
- **Budget Booking**: PIs can create budget requests linked to projects
- **Request Tracking**: View pending, approved, and rejected requests
- **Historical Records**: Complete audit trail of all transactions

### Modern UI/UX
- **Glassmorphism Design**: Premium, modern interface
- **Responsive Layout**: Works seamlessly on desktop and mobile
- **Dark Mode Support**: Eye-friendly dark theme
- **Interactive Components**: Smooth animations and transitions

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern UI library
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **React Router DOM** - Client-side routing

### UI Components & Styling
- **Shadcn UI** - High-quality component library
- **Radix UI** - Accessible component primitives
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icon library

### State Management & Forms
- **TanStack Query** - Server state management
- **React Hook Form** - Form handling
- **Zod** - Schema validation

### Additional Libraries
- **date-fns** - Date manipulation
- **Recharts** - Data visualization
- **Sonner** - Toast notifications

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher) - [Install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- **npm** or **bun** package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ifms
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   # or
   bun dev
   ```

4. **Open your browser**
   
   Navigate to `http://localhost:5173` (or the port shown in your terminal)

### Build for Production

```bash
npm run build
# or
bun run build
```

The production-ready files will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
# or
bun run preview
```

## 👥 User Roles & Access

The system supports multiple user roles, each with specific permissions and responsibilities:

| Role | Email | Responsibilities |
|------|-------|------------------|
| **Admin** | admin@ifms.edu | Create projects, review PI requests, manage system |
| **PI** | pi@ifms.edu | Create budget requests, track submissions |
| **AR** | ar@ifms.edu | Review admin-approved requests |
| **DR** | dr@ifms.edu | Review AR-approved requests |
| **AO2** | ao2@ifms.edu | Final approval authority |

**Default Password for all roles**: `password123`

## 🔄 Workflow Process

```
┌─────────────────────────────────────────────────────────────┐
│                    Budget Request Lifecycle                  │
└─────────────────────────────────────────────────────────────┘

1. PI Creates Request
   └─→ Status: Pending Admin

2. Admin Reviews
   ├─→ Approve → Status: Pending AR
   └─→ Reject → Status: Rejected (End)

3. AR Reviews
   ├─→ Approve → Status: Pending DR
   └─→ Reject → Status: Rejected (End)

4. DR Reviews
   ├─→ Approve → Status: Pending AO2
   └─→ Reject → Status: Rejected (End)

5. AO2 Reviews
   ├─→ Approve → Status: Approved (End)
   └─→ Reject → Status: Rejected (End)
```

### Workflow Rules
- Requests must follow the sequential approval chain
- Any role can reject a request with comments
- Rejected requests cannot be resubmitted (new request required)
- All actions are logged in the approval timeline
- Each role can only see requests relevant to their stage

## 📱 Using the Application

### For Principal Investigators (PI)

1. **Login** with PI credentials
2. **Dashboard** shows your budget requests and their status
3. **Create New Request**:
   - Select a project
   - Enter budget details
   - Add description and justification
   - Submit for admin review
4. **Track Progress** through the approval timeline

### For Approvers (Admin, AR, DR, AO2)

1. **Login** with your role credentials
2. **Dashboard** displays pending requests for your review
3. **Review Requests**:
   - View request details
   - Check approval timeline
   - Add comments
   - Approve or Reject
4. **View History** of completed requests

### For Administrators

In addition to approval duties:
- **Create Projects** for PIs to use
- **Manage Users** (if implemented)
- **View System Statistics**

## 📂 Project Structure

```
ifms/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── ui/           # Shadcn UI components
│   │   ├── Layout.tsx    # Main layout wrapper
│   │   ├── ApprovalTimeline.tsx
│   │   └── BudgetReviewDialog.tsx
│   ├── pages/            # Route pages
│   │   ├── admin/        # Admin dashboard pages
│   │   ├── approvals/    # AR, DR, AO2 pages
│   │   ├── pi/           # PI dashboard pages
│   │   ├── Login.tsx
│   │   └── Index.tsx
│   ├── lib/              # Utility functions
│   │   ├── auth.ts       # Authentication logic
│   │   └── utils.ts      # Helper functions
│   ├── hooks/            # Custom React hooks
│   ├── App.tsx           # Main app component
│   └── main.tsx          # Entry point
├── public/               # Static assets
├── index.html           # HTML template
├── package.json         # Dependencies
├── vite.config.ts       # Vite configuration
├── tailwind.config.ts   # Tailwind configuration
└── tsconfig.json        # TypeScript configuration
```

## 🔧 Configuration

### Environment Variables

Currently, the application runs in frontend-only mode with mock data. For production deployment with a backend:

1. Create a `.env` file in the root directory
2. Add your API endpoint:
   ```
   VITE_API_URL=https://your-api-endpoint.com
   ```

### Customization

- **Theme Colors**: Edit `tailwind.config.ts`
- **UI Components**: Modify files in `src/components/ui/`
- **Routing**: Update `src/App.tsx`

## 🧪 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Code Quality

The project uses:
- **ESLint** for code linting
- **TypeScript** for type checking
- **Prettier** (recommended) for code formatting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request


## 🎯 Roadmap

- [ ] Backend API integration
- [ ] Database persistence
- [ ] Email notifications
- [ ] PDF report generation
- [ ] Advanced analytics dashboard
- [ ] Multi-institution support
- [ ] Mobile app (React Native)

---

**Built with ❤️ for educational institutions**
