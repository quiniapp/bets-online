# Dual Authentication Betting Platform - Project Structure

## Overview
This document outlines the complete folder structure for the dual authentication betting platform built with Next.js 15, TypeScript, and Tailwind CSS.

## Directory Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── admin/                    # Admin dashboard pages
│   │   ├── page.tsx             # Admin dashboard home
│   │   ├── users/page.tsx       # User management
│   │   ├── games/page.tsx       # Game management
│   │   ├── balance/page.tsx     # Balance management
│   │   └── management/page.tsx  # Admin management
│   ├── dashboard/               # User dashboard pages
│   │   ├── page.tsx            # User dashboard home
│   │   ├── profile/page.tsx    # Profile settings
│   │   ├── games/page.tsx      # Available games
│   │   ├── history/page.tsx    # Account history
│   │   └── contact/page.tsx    # Contact admin
│   ├── admin-login/page.tsx    # Admin login page
│   ├── user-login/page.tsx     # User login page
│   ├── api/                    # API routes
│   │   ├── auth/               # Authentication endpoints
│   │   │   ├── login/route.ts  # Login endpoint
│   │   │   └── logout/route.ts # Logout endpoint
│   │   ├── users/              # User management endpoints
│   │   │   ├── route.ts        # Users CRUD
│   │   │   └── [id]/route.ts   # Individual user operations
│   │   ├── games/route.ts      # Games management
│   │   └── bets/route.ts       # Betting operations
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Landing page
├── components/                  # React components
│   ├── auth/                   # Authentication components
│   │   ├── AdminLoginForm.tsx  # Admin login form
│   │   ├── UserLoginForm.tsx   # User login form
│   │   └── LoginLayout.tsx     # Shared login layout
│   ├── admin/                  # Admin dashboard components
│   │   ├── AdminSidebar.tsx    # Admin navigation
│   │   ├── AdminManagement.tsx # Admin CRUD operations
│   │   ├── UserManagement.tsx  # User management interface
│   │   ├── GameManagement.tsx  # Game management interface
│   │   └── BalanceManagement.tsx # Balance management interface
│   └── user/                   # User dashboard components
│       ├── UserSidebar.tsx     # User navigation
│       ├── ProfileSettings.tsx # Profile management
│       ├── GameAccessRequest.tsx # Game access requests
│       ├── BettingInterface.tsx # Betting interface
│       └── AccountHistory.tsx  # Account history display
├── lib/                        # Utility libraries and services
│   ├── types/                  # TypeScript type definitions
│   │   └── index.ts           # Core types and interfaces
│   ├── auth/                   # Authentication utilities
│   │   ├── auth-context.tsx   # Authentication context
│   │   └── middleware.ts      # Auth middleware
│   ├── database/              # Database layer
│   │   ├── connection.ts      # Database connection
│   │   └── repositories/      # Data access layer
│   │       ├── user-repository.ts
│   │       ├── admin-repository.ts
│   │       ├── game-repository.ts
│   │       ├── bet-repository.ts
│   │       └── transaction-repository.ts
│   ├── services/              # Business logic services
│   │   ├── auth-service.ts    # Authentication service
│   │   ├── user-service.ts    # User management service
│   │   └── betting-service.ts # Betting logic service
│   └── utils/                 # Utility functions
│       ├── validation.ts      # Zod validation schemas
│       └── constants.ts       # Application constants
├── styles/                    # Global styles
│   └── globals.css           # Global CSS with Tailwind
└── env.js                    # Environment configuration
```

## Key Features by Directory

### Authentication (`/auth`)
- Separate login forms for admins and users
- Shared authentication context
- Role-based middleware protection

### Admin Dashboard (`/admin`)
- Complete user management (CRUD operations)
- Game access control for users
- Balance management and adjustments
- Admin account management

### User Dashboard (`/dashboard`)
- Profile settings (username modification)
- Game access requests
- Betting interface for enabled games
- Account history and balance tracking

### API Layer (`/api`)
- RESTful endpoints for all operations
- Authentication and authorization
- User, game, and betting management

### Database Layer (`/lib/database`)
- Repository pattern for data access
- Abstracted database operations
- Support for multiple database backends

### Services (`/lib/services`)
- Business logic separation
- Authentication services
- User and betting operations

### Types (`/lib/types`)
- Complete TypeScript definitions
- Interface definitions for all entities
- Type safety throughout the application

## Next Steps

1. **Database Setup**: Choose and configure the database solution (SQLite, PostgreSQL, etc.)
2. **Authentication Implementation**: Implement NextAuth.js or custom authentication
3. **Component Development**: Build out the UI components with proper styling
4. **API Implementation**: Develop the backend API endpoints
5. **Testing**: Add unit and integration tests
6. **Security**: Implement proper security measures and validation

## Dependencies to Install

Based on the chosen database and authentication solution:
- Authentication library (NextAuth.js or custom)
- Database ORM/client
- Password hashing library (bcryptjs)
- Additional utilities as needed

This structure provides a solid foundation for the dual authentication betting platform with clear separation of concerns and scalable architecture.