# ClientNest Pro 🚀

**CRM & Fee Management Platform for Software Companies**

A comprehensive, enterprise-grade platform managing the entire client lifecycle—from first contact and sales pipeline through licensing, billing, support, and contract renewal.

![Status](https://img.shields.io/badge/status-production--ready-success)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## ✨ Features

### 🎯 Complete Client Lifecycle Management

* **Lead & Pipeline Management** - Track prospects from initial contact to conversion
* **Client Profiles** - Comprehensive company and contact management
* **License Management** - Track software licenses, subscriptions, and renewals
* **Financial Management** - Invoices, payments, credit notes, and hosting fees
* **Support & SLA Tracking** - Ticket management with SLA compliance monitoring
* **Contract Management** - Document storage with expiry tracking
* **Feature Requests** - Roadmap linkage and cost estimation
* **Audit Trail** - Complete system-wide activity logging

### 🔐 Role-Based Access Control (RBAC)

* **Admin** - Full system access
* **Finance** - Financial records and reporting
* **Support** - Ticket management and client activity
* **Sales** - Lead pipeline and client profiles

### 📊 Real-Time Dashboards & Reports

* Total MRR (Monthly Recurring Revenue)
* Client Health Scores (Green/Amber/Red)
* Overdue invoices and payments
* Open support tickets and SLA breaches
* Sales pipeline conversion rates
* Client profitability analysis

---

## 🛠️ Tech Stack

### Frontend

* React 18 + TypeScript
* TanStack Query (React Query)
* React Router
* Tailwind CSS
* Vite

### Backend

* Node.js + Express
* TypeScript
* Prisma ORM
* PostgreSQL (Supabase)
* JWT Authentication
* Docker

### Infrastructure

* Docker & Docker Compose
* PostgreSQL (Supabase)
* Deployment: Vercel (Frontend) + Railway (Backend)

---

## 🚀 Quick Start

### Prerequisites

Before running the project, make sure you have:

* Node.js 20+
* Docker & Docker Compose (optional)
* PostgreSQL database (or use Supabase free tier)

---

### Option 1: Docker

Docker is the recommended way to run the complete application.

```bash
# Clone the repository
git clone https://github.com/yourusername/clientnest-pro.git

# Enter the project directory
cd clientnest-pro

# Copy environment variables
cp .env.example .env

# Edit your environment variables
nano .env

# Start the application
docker compose up --build
```

Once the containers are running:

```text
Frontend: http://localhost:3000
Backend:  http://localhost:5000/api
```

---

### Option 2: Manual Setup

#### Backend

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit your environment variables
nano .env

# Run Prisma migrations
npx prisma migrate dev

# Start development server
npm run dev
```

The backend will run at:

```text
http://localhost:5000
```

#### Frontend

Open another terminal:

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will run at:

```text
http://localhost:3000
```

---

## 📖 Environment Variables

Create a `.env` file in the backend directory.

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# JWT Authentication
JWT_SECRET="your-super-secret-key-min-32-chars-long"
JWT_EXPIRES_IN="1d"

# CORS
CLIENT_URL="http://localhost:3000"
```

> ⚠️ **Important:** Never commit your `.env` file to GitHub or any other version-control repository.

Make sure `.env` is included in your `.gitignore` file.

---

## 🗄️ Database Setup

This project uses PostgreSQL through Supabase.

### Setup Steps

1. Create a Supabase account.
2. Create a new PostgreSQL project.
3. Open the database settings.
4. Copy your PostgreSQL connection string.
5. Add the connection string to `DATABASE_URL`.
6. Run the Prisma migrations.

```bash
npx prisma migrate dev
```

If you are using Prisma Client, generate it with:

```bash
npx prisma generate
```

---

## 📦 API Documentation

Once the backend is running, the API is available at:

```text
API Base URL:
http://localhost:5000/api

Health Check:
http://localhost:5000/api/health
```

### Key Endpoints

| Method | Endpoint                 | Description         |
| ------ | ------------------------ | ------------------- |
| POST   | `/api/auth/login`        | User authentication |
| GET    | `/api/clients`           | List all clients    |
| POST   | `/api/invoices`          | Create invoice      |
| GET    | `/api/reports/dashboard` | Dashboard metrics   |

> Full API documentation can be added at `/api/docs` in a future release.

---

## 🏗️ Project Structure

```text
clientnest-pro/
│
├── backend/
│   ├── src/
│   │   ├── controllers/       # Request handlers
│   │   ├── middleware/        # Authentication, validation, error handling
│   │   ├── routes/            # API routes
│   │   ├── utils/             # Helper functions
│   │   └── validators/        # Zod schemas
│   │
│   ├── prisma/
│   │   └── schema.prisma      # Database schema
│   │
│   ├── package.json
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Page components
│   │   ├── context/           # React context
│   │   ├── lib/               # API client and utilities
│   │   └── types/             # TypeScript types
│   │
│   ├── package.json
│   └── Dockerfile
│
├── docker-compose.yml         # Docker orchestration
├── .env.example               # Environment variables template
├── .gitignore
└── README.md                  # Project documentation
```

---

## 🔐 Security

ClientNest Pro includes several security mechanisms:

* **JWT Authentication** - Secure token-based authentication
* **RBAC** - Role-based access control
* **Input Validation** - Zod schemas for validating user input
* **SQL Injection Protection** - Prisma ORM parameterized queries
* **CORS** - Configured for specific origins
* **Audit Trail** - Financial and important system actions are logged

---

## 📊 Modules Overview

| Module | Feature                             | Status     |
| ------ | ----------------------------------- | ---------- |
| **A**  | Lead & Opportunity Management       | ✅ Complete |
| **B**  | Customer & Company Management       | ✅ Complete |
| **C**  | Product & License Management        | ✅ Complete |
| **D**  | Financial Management & Fee Tracking | ✅ Complete |
| **E**  | Contract & Document Management      | ✅ Complete |
| **F**  | Activity Logging & Support          | ✅ Complete |
| **G**  | Feature Upgrades & Roadmap          | ✅ Complete |
| **H**  | Dashboard & Reporting               | ✅ Complete |
| **I**  | System Administration & Audit       | ✅ Complete |

---

## 🚢 Deployment

### Frontend — Vercel

The frontend can be deployed to Vercel.

Using the Vercel CLI:

```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to frontend
cd frontend

# Deploy
vercel
```

Alternatively, connect the GitHub repository to Vercel and configure the frontend directory as the project root.

### Backend — Railway

The backend can be deployed to Railway using Docker.

Steps:

1. Push the project to GitHub.
2. Create a new project on Railway.
3. Select **Deploy from GitHub**.
4. Select the project repository.
5. Configure the required environment variables.
6. Railway will detect the Docker configuration and deploy the backend.

### Database — Supabase

The application uses PostgreSQL through Supabase.

Configure the production `DATABASE_URL` in Railway using the connection string provided by Supabase.

---

## 🌐 Production Environment

After deployment, update the frontend API URL to point to the production backend.

For example:

```env
VITE_API_URL=https://your-railway-app.railway.app/api
```

Add this environment variable to the frontend deployment environment.

After changing environment variables, redeploy the frontend.

---

## 🧪 Testing

### Backend

```bash
cd backend
npm test
```

### Frontend

```bash
cd frontend
npm test
```

---

## 🤝 Contributing

Contributions are welcome.

### 1. Fork the Repository

Create your own fork of the project.

### 2. Create a Feature Branch

```bash
git checkout -b feature/AmazingFeature
```

### 3. Make Your Changes

Implement your feature or fix.

### 4. Commit Your Changes

```bash
git add .
git commit -m "Add AmazingFeature"
```

### 5. Push Your Branch

```bash
git push origin feature/AmazingFeature
```

### 6. Open a Pull Request

Create a Pull Request describing your changes.

---

## 📝 License

This project is licensed under the MIT License.

See the `LICENSE` file for more information.

---

## 👥 Authors

* **Hussein Beshir** — Initial work
* **https://github.com/HussooB** — GitHub Profile

---

## 🙏 Acknowledgments

Special thanks to the technologies and platforms used to build this project:

* Supabase — PostgreSQL database platform
* Prisma — TypeScript ORM
* TanStack — React Query
* Vercel — Frontend deployment
* Railway — Backend deployment
* Docker — Containerization

---

## 📞 Support

For issues, bugs, or questions:

* Open an issue on GitHub
* Contact the project maintainers

---

## 📌 Project Status

**Status:** Production Ready 🚀

ClientNest Pro is designed to provide a centralized platform for managing clients, licenses, financial operations, support, contracts, feature requests, and business reporting.

---

## ❤️ Built For

Built as part of the **Intern Project 2026**.

**ClientNest Pro — Managing clients, operations, and growth in one place.**
