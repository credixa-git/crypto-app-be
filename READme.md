# Investment App API Documentation

## Overview

This document provides comprehensive API specifications for the Investment App backend. The client-side has been structured with proper hooks and services to consume these APIs.

## Base Configuration

- **Base URL**: `https://api.investmentapp.com` (Update with actual URL)
- **Authentication**: Bearer Token (non-expiry)
- **Content-Type**: `application/json`
- **File Uploads**: `multipart/form-data`

## Authentication Flow

### 1. User Registration

```http
POST /auth/signup
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Account created successfully. Please verify your email.",
  "data": {
    "userId": "user_12345",
    "message": "OTP sent to email"
  }
}
```

### 2. Email OTP Verification

```http
POST /auth/verify-otp
Content-Type: application/json

{
  "email": "john@example.com",
  "otp": "123456",
  "type": "signup" // "signup" | "login" | "forgot_password"
}
```

**Response:**

```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "userId": "user_12345",
    "accessToken": "eyJhbGciOiJIUzI1NiIs...", // For login type
    "verified": true
  }
}
```

### 3. User Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "userId": "user_12345",
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "user_12345",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "profileImage": null,
      "kycStatus": "completed",
      "joinDate": "2024-01-15T00:00:00Z",
      "referralCode": "JOHN123",
      "totalReferrals": 5,
      "referralEarnings": 150.0
    }
  }
}
```

### 4. Forgot Password

```http
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "john@example.com"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Password reset link sent to your email",
  "data": {
    "message": "Reset link sent to email"
  }
}
```

### 5. Logout

```http
POST /auth/logout
Authorization: Bearer {accessToken}
```

**Response:**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## User Data Management

### 1. Get User Data

```http
GET /user/data
Authorization: Bearer {accessToken}
```

**Response:**

```json
{
  "success": true,
  "message": "User data retrieved successfully",
  "data": {
    "user": {
      "id": "user_12345",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "profileImage": null,
      "kycStatus": "completed",
      "joinDate": "2024-01-15T00:00:00Z",
      "referralCode": "JOHN123",
      "totalReferrals": 5,
      "referralEarnings": 150.0
    },
    "portfolio": {
      "totalBalance": 5000.0,
      "totalInvested": 4500.0,
      "totalWithdrawn": 200.0,
      "totalEarnings": 500.0,
      "dailyEarnings": 25.0,
      "monthlyEarnings": 750.0,
      "annualEarnings": 9000.0,
      "interestRate": 2.5,
      "pendingDeposits": 100.0,
      "pendingWithdrawals": 50.0,
      "lastUpdated": "2024-01-20T10:30:00Z"
    }
  }
}
```

### 2. Update User Profile

```http
PUT /user/profile
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "John Smith",
  "phone": "+1234567891",
  "profileImage": "base64_encoded_image_string"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      // Updated user object
    }
  }
}
```

---

## Deposit Operations

### 1. Get Supported Tokens

```http
GET /deposit/tokens
Authorization: Bearer {accessToken}
```

**Response:**

```json
{
  "success": true,
  "message": "Tokens retrieved successfully",
  "data": {
    "tokens": [
      {
        "id": "usdt",
        "symbol": "USDT",
        "name": "Tether USD",
        "type": "CRYPTO",
        "currency": "USDT",
        "image": "newUsdtIcon",
        "availableAmount": "1000.00",
        "isActive": true,
        "networks": [
          {
            "key": "TRON",
            "label": "Tron (TRC20)",
            "icon": "usdtIcon",
            "minDeposit": 10.0,
            "maxDeposit": 100000.0,
            "fee": 0.0
          },
          {
            "key": "ETHEREUM",
            "label": "Ethereum (ERC20)",
            "icon": "newEthIcon",
            "minDeposit": 10.0,
            "maxDeposit": 100000.0,
            "fee": 0.0
          },
          {
            "key": "BSC",
            "label": "BNB Smart Chain (BEP20)",
            "icon": "bscIcon",
            "minDeposit": 10.0,
            "maxDeposit": 100000.0,
            "fee": 0.0
          }
        ]
      }
    ]
  }
}
```

### 2. Get Deposit Address

```http
POST /deposit/address
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "token": "USDT",
  "network": "TRON",
  "amount": 100.00
}
```

**Response:**

```json
{
  "success": true,
  "message": "Deposit address generated successfully",
  "data": {
    "address": "TPxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "qrCode": "data:image/png;base64,iVBORw0KGgo...",
    "token": "USDT",
    "tokenName": "Tether USD",
    "network": "TRON",
    "networkName": "Tron (TRC20)",
    "minAmount": 10.0,
    "maxAmount": 100000.0,
    "fee": 0.0,
    "estimatedConfirmations": 6,
    "expiresAt": "2024-01-21T10:30:00Z"
  }
}
```

### 3. Place Deposit Request

```http
POST /deposit/request
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "transactionHash": "abc123def456...",
  "token": "USDT",
  "network": "TRON",
  "amount": 100.00,
  "depositAddress": "TPxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "screenshot": "base64_encoded_image", // Optional
  "notes": "First deposit" // Optional
}
```

**Response:**

```json
{
  "success": true,
  "message": "Deposit request submitted successfully",
  "data": {
    "requestId": "dep_12345",
    "status": "pending",
    "estimatedProcessingTime": "24-48 hours",
    "transactionHash": "abc123def456...",
    "amount": 100.0,
    "token": "USDT",
    "network": "TRON",
    "createdAt": "2024-01-20T10:30:00Z"
  }
}
```

---

## Withdrawal Operations

### 1. Get Withdrawal Settings

```http
GET /withdrawal/settings
Authorization: Bearer {accessToken}
```

**Response:**

```json
{
  "success": true,
  "message": "Withdrawal settings retrieved successfully",
  "data": {
    "minWithdrawal": 50.0,
    "maxWithdrawal": 1000.0,
    "withdrawalFee": 2.5, // percentage
    "processingTime": "24-48 hours",
    "allowedDays": ["monday", "tuesday", "wednesday", "thursday", "friday"],
    "allowedTime": {
      "start": "09:00",
      "end": "17:00"
    },
    "dailyLimit": 5000.0,
    "monthlyLimit": 50000.0,
    "remainingDailyLimit": 4500.0,
    "remainingMonthlyLimit": 45000.0
  }
}
```

### 2. Place Withdrawal Request

```http
POST /withdrawal/request
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "address": "TPxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "token": "USDT",
  "network": "TRON",
  "amount": 100.00,
  "notes": "Monthly withdrawal", // Optional
  "addressLabel": "My Wallet" // Optional
}
```

**Response:**

```json
{
  "success": true,
  "message": "Withdrawal request submitted successfully",
  "data": {
    "requestId": "with_12345",
    "status": "pending",
    "estimatedProcessingTime": "24-48 hours",
    "amount": 100.0,
    "fee": 2.5,
    "netAmount": 97.5,
    "token": "USDT",
    "network": "TRON",
    "address": "TPxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "createdAt": "2024-01-20T10:30:00Z"
  }
}
```

---

## Transaction History

### 1. Get Deposits and Withdrawals

```http
GET /transactions/deposits-withdrawals?type=all&status=all&page=1&limit=20
Authorization: Bearer {accessToken}
```

**Query Parameters:**

- `type`: `all`, `deposits`, `withdrawals`
- `status`: `all`, `pending`, `completed`, `failed`
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `startDate`: Start date (ISO string)
- `endDate`: End date (ISO string)

**Response:**

```json
{
  "success": true,
  "message": "Transactions retrieved successfully",
  "data": {
    "transactions": [
      {
        "id": "txn_12345",
        "type": "deposit", // "deposit" | "withdrawal"
        "amount": 100.0,
        "fee": 0.0,
        "netAmount": 100.0,
        "token": "USDT",
        "network": "TRON",
        "address": "TPxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", // For withdrawals
        "transactionHash": "abc123def456...",
        "status": "completed", // "pending" | "processing" | "completed" | "failed" | "rejected"
        "notes": "First deposit",
        "screenshot": "base64_image", // For deposits
        "createdAt": "2024-01-20T10:30:00Z",
        "updatedAt": "2024-01-20T12:30:00Z",
        "processedAt": "2024-01-20T12:30:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalCount": 100,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

### 2. Get Statement (All Transaction Types)

```http
GET /transactions/statement?type=all&page=1&limit=20
Authorization: Bearer {accessToken}
```

**Query Parameters:**

- `type`: `all`, `deposit`, `withdrawal`, `interest`, `referral`, `bonus`
- `page`: Page number
- `limit`: Items per page
- `startDate`: Start date
- `endDate`: End date

**Response:**

```json
{
  "success": true,
  "message": "Statement retrieved successfully",
  "data": {
    "transactions": [
      {
        "id": "txn_12345",
        "type": "deposit", // "deposit" | "withdrawal" | "interest" | "referral" | "bonus"
        "amount": 100.0,
        "status": "completed",
        "date": "2024-01-20T10:30:00Z",
        "description": "Initial deposit",
        "reference": "DEP001",
        "relatedTransactionId": "dep_12345", // For deposits/withdrawals
        "metadata": {} // Additional data
      }
    ],
    "summary": {
      "totalDeposits": 1000.0,
      "totalWithdrawals": 200.0,
      "totalInterest": 100.0,
      "totalReferrals": 50.0,
      "totalBonus": 25.0,
      "netBalance": 975.0
    },
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalCount": 50,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

---

## Address Book Management

### 1. Get Address Book

```http
GET /address-book?network=TRON
Authorization: Bearer {accessToken}
```

**Query Parameters:**

- `network`: Filter by network (optional)

**Response:**

```json
{
  "success": true,
  "message": "Address book retrieved successfully",
  "data": {
    "addresses": [
      {
        "id": "addr_12345",
        "network": "TRON",
        "networkName": "Tron (TRC20)",
        "address": "TPxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "label": "My Main Wallet",
        "isDefault": true,
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-20T10:30:00Z"
      }
    ]
  }
}
```

### 2. Add Address

```http
POST /address-book
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "network": "TRON",
  "address": "TPxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "label": "My Wallet",
  "isDefault": false
}
```

**Response:**

```json
{
  "success": true,
  "message": "Address added successfully",
  "data": {
    "addressId": "addr_12346",
    "address": {
      "id": "addr_12346",
      "network": "TRON",
      "networkName": "Tron (TRC20)",
      "address": "TPxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "label": "My Wallet",
      "isDefault": false,
      "createdAt": "2024-01-20T10:30:00Z"
    }
  }
}
```

### 3. Update Address

```http
PUT /address-book/{addressId}
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "label": "Updated Wallet Name",
  "isDefault": true
}
```

### 4. Delete Address

```http
DELETE /address-book/{addressId}
Authorization: Bearer {accessToken}
```

---

## Referral System

### 1. Get Referrals

```http
GET /referrals?page=1&limit=20
Authorization: Bearer {accessToken}
```

**Response:**

```json
{
  "success": true,
  "message": "Referrals retrieved successfully",
  "data": {
    "referrals": [
      {
        "id": "ref_12345",
        "name": "Jane Smith",
        "email": "jane@example.com",
        "joinDate": "2024-01-16T00:00:00Z",
        "status": "active", // "active" | "inactive"
        "totalInvested": 500.0,
        "commissionEarned": 25.0,
        "lastActivity": "2024-01-20T10:30:00Z"
      }
    ],
    "summary": {
      "totalReferrals": 5,
      "totalCommissions": 150.0,
      "monthlyCommissions": 45.0,
      "referralCode": "JOHN123"
    },
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalCount": 5,
      "hasNext": false,
      "hasPrevious": false
    }
  }
}
```

---

## Investment Plans

### 1. Get Investment Plans

```http
GET /investment-plans
Authorization: Bearer {accessToken}
```

**Response:**

```json
{
  "success": true,
  "message": "Investment plans retrieved successfully",
  "data": {
    "plans": [
      {
        "id": "plan_1",
        "name": "Basic Plan",
        "minAmount": 100.0,
        "maxAmount": 1000.0,
        "dailyInterest": 1.5, // percentage
        "duration": 30, // days
        "description": "Perfect for beginners",
        "isActive": true,
        "features": [
          "Daily interest payments",
          "Flexible withdrawal",
          "No hidden fees",
          "24/7 support"
        ],
        "terms": "Terms and conditions apply..."
      }
    ]
  }
}
```

---

## Notifications

### 1. Get Notifications

```http
GET /notifications?page=1&limit=20&isRead=all
Authorization: Bearer {accessToken}
```

**Query Parameters:**

- `page`: Page number
- `limit`: Items per page
- `isRead`: `all`, `true`, `false`

**Response:**

```json
{
  "success": true,
  "message": "Notifications retrieved successfully",
  "data": {
    "notifications": [
      {
        "id": "notif_12345",
        "title": "Daily Interest Credited",
        "message": "Your daily interest of $25.00 has been credited to your account.",
        "type": "success", // "success" | "info" | "warning" | "error"
        "timestamp": "2024-01-20T00:00:00Z",
        "isRead": false,
        "data": {
          "amount": "$25.00",
          "transactionId": "txn_interest_123"
        }
      }
    ],
    "unreadCount": 3,
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalCount": 25,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

### 2. Mark Notification as Read

```http
PATCH /notifications/{notificationId}/read
Authorization: Bearer {accessToken}
```

### 3. Mark All Notifications as Read

```http
PATCH /notifications/read-all
Authorization: Bearer {accessToken}
```

---

## KYC Management

### 1. Get KYC Status

```http
GET /kyc/status
Authorization: Bearer {accessToken}
```

**Response:**

```json
{
  "success": true,
  "message": "KYC status retrieved successfully",
  "data": {
    "kycId": "kyc_12345",
    "status": "approved", // "not_started" | "pending" | "in_progress" | "approved" | "rejected"
    "submittedAt": "2024-01-18T10:30:00Z",
    "processedAt": "2024-01-19T15:30:00Z",
    "rejectionReason": null,
    "documentType": "AADHAR_CARD",
    "personalInfo": {
      "fullName": "John Doe",
      "dateOfBirth": "1990-01-01",
      "address": "123 Main Street",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "country": "India"
    }
  }
}
```

### 2. Submit KYC

```http
POST /kyc/submit
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data

{
  "documentType": "AADHAR_CARD", // "AADHAR_CARD" | "PAN_CARD" | "DRIVING_LICENSE"
  "frontImage": [File],
  "backImage": [File],
  "selfieImage": [File], // Optional
  "personalInfo": {
    "fullName": "John Doe",
    "dateOfBirth": "1990-01-01",
    "address": "123 Main Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "country": "India"
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "KYC documents submitted successfully",
  "data": {
    "kycId": "kyc_12346",
    "status": "pending",
    "submittedAt": "2024-01-20T10:30:00Z",
    "estimatedProcessingTime": "2-5 business days"
  }
}
```

---

## Admin Endpoints (Backend Reference)

### 1. Approve Deposit

```http
POST /admin/deposits/{depositId}/approve
Authorization: Bearer {adminToken}
Content-Type: application/json

{
  "approvedAmount": 100.00, // Optional, if different from requested
  "duration": 30, // days
  "dailyInterest": 2.5, // amount, not percentage
  "notes": "Approved after verification"
}
```

### 2. Update Deposit (Add to existing)

```http
POST /admin/deposits/update
Authorization: Bearer {adminToken}
Content-Type: application/json

{
  "userId": "user_12345",
  "additionalAmount": 500.00,
  "duration": 60, // days
  "dailyInterest": 12.5, // amount
  "notes": "Additional investment"
}
```

### 3. Approve Withdrawal

```http
POST /admin/withdrawals/{withdrawalId}/approve
Authorization: Bearer {adminToken}
Content-Type: application/json

{
  "transactionHash": "def456abc789...", // Optional
  "notes": "Processed successfully"
}
```

### 4. Change Deposit Address

```http
POST /admin/deposit-addresses/update
Authorization: Bearer {adminToken}
Content-Type: application/json

{
  "token": "USDT",
  "network": "TRON",
  "newAddress": "TPyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy",
  "qrCode": "base64_qr_code_image"
}
```

### 5. Get All Users

```http
GET /admin/users?page=1&limit=50&search=john&kycStatus=completed
Authorization: Bearer {adminToken}
```

**Response:**

```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": {
    "users": [
      {
        "id": "user_12345",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1234567890",
        "kycStatus": "completed",
        "totalBalance": 5000.0,
        "totalInvested": 4500.0,
        "totalWithdrawn": 200.0,
        "joinDate": "2024-01-15T00:00:00Z",
        "lastActivity": "2024-01-20T10:30:00Z",
        "isActive": true
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalCount": 500,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

---

## Error Handling

### Standard Error Response

```json
{
  "success": false,
  "message": "User-friendly error message",
  "error": {
    "code": "ERROR_CODE",
    "details": "Technical error details",
    "field": "fieldName" // If field-specific error
  },
  "timestamp": "2024-01-20T10:30:00Z"
}
```

### Validation Error Response

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format",
      "code": "INVALID_EMAIL"
    },
    {
      "field": "amount",
      "message": "Amount must be greater than minimum",
      "code": "AMOUNT_TOO_LOW"
    }
  ],
  "timestamp": "2024-01-20T10:30:00Z"
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (Validation errors)
- `401` - Unauthorized (Invalid/expired token)
- `403` - Forbidden (Insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

---

## Implementation Notes

### Client-Side Integration

The client-side has been structured with:

1. **API Service** (`src/services/apiService.js`)

   - Centralized API calls
   - Token management
   - Error handling
   - Retry logic

2. **Custom Hooks** (`src/hooks/`)

   - `useAuth` - Authentication operations
   - `useUserData` - User profile and portfolio
   - `useTransactions` - Transaction history
   - `useDeposits` - Deposit operations
   - `useWithdrawals` - Withdrawal operations
   - `useAddressBook` - Address management
   - `useReferrals` - Referral system
   - `useNotifications` - Notification management
   - `useKYC` - KYC operations

3. **Type Definitions** (`src/services/apiModels.js`)
   - Complete API models
   - Request/response types
   - Validation helpers

### Backend Implementation Priorities

1. **Phase 1 - Core Authentication**

   - User registration/login
   - OTP verification
   - JWT token management

2. **Phase 2 - User Management**

   - Profile management
   - KYC submission/verification
   - Password reset

3. **Phase 3 - Financial Operations**

   - Deposit address generation
   - Deposit request processing
   - Withdrawal processing
   - Transaction history

4. **Phase 4 - Advanced Features**

   - Referral system
   - Notification system
   - Investment plans
   - Address book

5. **Phase 5 - Admin Panel**
   - User management
   - Transaction approval
   - System configuration

### Security Considerations

1. **Authentication**

   - Use secure JWT tokens
   - Implement token refresh mechanism
   - Rate limiting on auth endpoints

2. **Data Validation**

   - Validate all inputs server-side
   - Sanitize user data
   - Use parameterized queries

3. **Financial Security**

   - Multi-signature wallets
   - Transaction verification
   - Audit logs for all financial operations

4. **KYC/AML Compliance**
   - Secure document storage
   - Identity verification
   - Transaction monitoring

### Database Schema Suggestions

1. **Users Table**

   - Basic user information
   - Authentication details
   - KYC status

2. **Portfolios Table**

   - User balance information
   - Investment tracking
   - Interest calculations

3. **Transactions Table**

   - All transaction types
   - Status tracking
   - Audit trail

4. **Deposits/Withdrawals Tables**

   - Request details
   - Processing status
   - Admin actions

5. **Address Book Table**

   - User saved addresses
   - Network information
   - Labels

6. **Referrals Table**
   - Referral relationships
   - Commission tracking
   - Performance metrics

This documentation provides a complete specification for the Investment App backend. The client-side is already structured to consume these APIs through the implemented hooks and services.
