# IPO Management System - Backend

A comprehensive backend API for managing IPO (Initial Public Offering) data including Mainboard and SME IPOs.

## Features

- **IPO Management**: Create, read, update, and delete IPO listings
- **Dual IPO Types**: Support for both Mainboard and SME IPOs
- **User Management**: Admin and customer user management with PAN document handling
- **Authentication**: JWT-based authentication with OTP verification
- **Data Filtering**: Filter IPOs by status (UPCOMING, OPEN, CLOSED, LISTED) and type
- **Rich Data Models**: Comprehensive IPO data including:
  - Subscription details (QIB, NII, Retail, Employee)
  - GMP (Grey Market Premium) tracking
  - Financial information (Revenue, Profit, EPS, Valuation)
  - Listing information (Price, Gains, Day High/Low)
  - Document links (RHP, DRHP PDFs)

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT, bcrypt
- **Validation**: Zod
- **File Upload**: Cloudinary
- **Email**: Nodemailer

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd IPO
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file in the root directory:
```env
PORT=4000
DB_URL=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
NODE_ENV=development
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

4. Seed the database (optional):
```bash
node src/seeder.js
```

5. Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:4000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/verify-otp` - Verify OTP
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### IPO Management
- `GET /api/v1/mainboards` - Get all IPOs (supports filtering by status and ipoType)
- `POST /api/v1/mainboards` - Create new IPO (Admin only)
- `GET /api/v1/mainboard/:id` - Get IPO by ID
- `PATCH /api/v1/mainboard/:id` - Update IPO (Admin only)
- `DELETE /api/v1/mainboard/:id` - Delete IPO (Admin only)

### User Management (Admin)
- `GET /api/users` - Get all users
- `GET /api/users/customers` - Get all customers (non-admin users)
- `PUT /api/users/:id/pan` - Update user PAN documents

### User PAN Management
- `POST /api/users/profile/pan` - Add PAN document
- `DELETE /api/users/profile/pan/:panNumber` - Delete PAN document

## Database Schema

### Mainboard IPO
- Company information (name, slug, icon)
- IPO type (MAINBOARD/SME)
- Status (UPCOMING/OPEN/CLOSED/LISTED)
- Dates (open, close, listing, refund, allotment)
- Pricing (lot size, lot price)
- Subscription data
- GMP history
- Financial data
- Listing information
- Document links

### User
- Basic info (name, email, phone)
- Role (user/admin/superadmin)
- PAN documents array
- Verification status

## Seeder

The seeder generates:
- 208 IPOs (52 per status) with 70% MAINBOARD and 30% SME distribution
- 50 test users with random PAN documents

Run with: `node src/seeder.js`

## License

ISC
