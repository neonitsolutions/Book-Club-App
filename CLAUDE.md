
**Project**
Create  a solid blueprint for  web app for readers book club with the following features

The Administrator
•	Create different subscription plan with different payment plan and different numbers of days for each subscription plan.
•	Each subscription plan should have different number of books they can rent
•	The admin should be able to upload pictures and videos of all available books for rent 
•	The Admin should be able to upload  pictures and videos of all available books for sale
•	Create a scan code for each book to allow effective management
•	Once a book has been sold or rented out the database of the available books should be updated

The Subscribers
•	They should be able to signup without subscription
•	If they did not subscribe for rentals, they will be able to see all the books available for rent but will not be able to select for subscription
•	They will be able to see and select available books for sale and place order once they signup
•	Upon reception and returning of rented books, they should be able to use scan codes to confirm their book 
status.


**Tech Stack**

                         ┌──────────────────────────┐
                         │        INTERNET          │
                         └────────────┬─────────────┘
                                      │
                              HTTPS / TLS
                                      │
                         ┌────────────▼─────────────┐
                         │       NGINX / ALB         │
                         │   Reverse Proxy / SSL     │
                         └────────────┬─────────────┘
                                      │
                 ┌────────────────────┴──────────────────┐
                 │                                       │
        ┌────────▼────────┐                     ┌────────▼────────┐
        │   Web Frontend  │                     │  Admin Portal   │
        │ React / Next.js │                     │ React / Next.js │
        └────────┬────────┘                     └────────┬────────┘
                 │                                       │
                 └────────────────┬──────────────────────┘
                                  │ REST API
                         ┌────────▼──────────┐
                         │    Backend API    │
                         │ Node.js / NestJS  │
                         └────────┬──────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
       ┌──────▼──────┐     ┌──────▼──────┐     ┌─────▼───────┐
       │   MongoDB   │     │    Redis    │     │ Object      │
       │   Database  │     │ Cache/Queue │     │ Storage     │
       └─────────────┘     └─────────────┘     │ Images/Video│
                                               └─────────────┘
              │
       ┌──────▼─────────────────────────────────┐
       │ External Services                      │
       │ Payment Gateway | Email | SMS          │
       │ QR generation/scanning                 │
       └────────────────────────────────────────┘


                 CI/CD
                   │
        ┌──────────▼──────────┐
        │       GitHub/GitLab │
        └──────────┬──────────┘
                   │ Webhook
        ┌──────────▼──────────┐
        │       Jenkins       │
        └──────────┬──────────┘
                   │
       ┌───────────▼────────────┐
       │ Docker Build / Test   │
       │ Security Scan         │
       │ Push Image            │
       └───────────┬────────────┘
                   │
          ┌────────▼────────┐
          │ Production VPS /│
          │ AWS / Azure     │
          └─────────────────┘


2. User roles
I recommend four roles, not just Administrator and Subscriber.
ADMIN
Full system control.
STAFF
For employees handling physical books.
For example:
- Receive returned books
- Scan books
- Confirm condition
- Process rentals
- Process sales
- Mark damaged/lost books
MEMBER
Registered user who may or may not have an active rental subscription.
GUEST
Can browse the public catalog but cannot purchase or rent.

3. Core modules

Authentication
      │
      ├── Users
      ├── Roles
      ├── Permissions
      └── Sessions

Catalog
      │
      ├── Books
      ├── Categories
      ├── Authors
      ├── Publishers
      └── Media

Subscriptions
      │
      ├── Plans
      ├── Payments
      ├── Memberships
      └── Renewals

Rental
      │
      ├── Rental Cart
      ├── Rental Orders
      ├── Rental Period
      ├── Returns
      ├── Renewals
      └── Late Fees

Sales
      │
      ├── Shopping Cart
      ├── Orders
      ├── Payments
      └── Delivery

Inventory
      │
      ├── Book Copies
      ├── Availability
      ├── Locations
      ├── QR Codes
      └── Condition

Scanning
      │
      ├── Checkout Scan
      ├── Return Scan
      ├── Sale Scan
      └── Inventory Scan

Administration
      │
      ├── Dashboard
      ├── Reports
      ├── Users
      ├── Settings
      └── Audit Logs




4. Very important design decision: Book vs Book Copy
This is one of the most important parts of the architecture.
Do not make one MongoDB document represent both the title and the physical book.
Each physical copy gets its own QR code.

5. Book model
{
  _id: ObjectId(),

  title: "Atomic Habits",

  author: {
    name: "James Clear"
  },

  isbn: "9780735211292",

  description: "...",

  categoryId: ObjectId(),

  publisher: "Avery",

  publicationYear: 2018,

  coverImage: "...",

  media: [
    {
      type: "image",
      url: "..."
    },
    {
      type: "video",
      url: "..."
    }
  ],

  rentalEnabled: true,

  saleEnabled: true,

  rentalPrice: 0,

  salePrice: 15000,

  createdAt: Date,
  updatedAt: Date
}


6. Physical book copy model
{
  _id: ObjectId(),

  bookId: ObjectId(),

  inventoryCode: "RBC-ATOMIC-0001",

  qrCode: "...",

  status: "AVAILABLE",

  condition: "GOOD",

  location: "MAIN_LIBRARY",

  acquisitionDate: Date,

  purchasePrice: 5000,

  currentValue: 15000,

  createdAt: Date,
  updatedAt: Date
}

7. QR code system
Every physical book should receive a unique QR code.


8. Book scanning workflow
Member selects book
        ↓
Rental request
        ↓
System reserves available copy
        ↓
Staff scans QR
        ↓
System verifies copy
        ↓
Staff confirms checkout
        ↓
Book status = RENTED
        ↓
Rental record created

9. Subscription plans
Admin should be able to create unlimited plans.

10. Subscription lifecycle
SIGNUP
   ↓
NO SUBSCRIPTION
   ↓
Browse rental books
   ↓
Select subscription
   ↓
Payment
   ↓
PAYMENT VERIFIED
   ↓
ACTIVE SUBSCRIPTION
   ↓
Rent books
   ↓
Subscription approaching expiry
   ↓
RENEW

if expires
ACTIVE
  ↓
EXPIRING
  ↓
EXPIRED


10. Dashboard metrics
 Total members
 Active subscribers
Expired subscriptions
Books
Available copies
Rented copies
Sold copies
Overdue rentals
Damaged books
Lost books
Revenue
Monthly subscriptions
Sales revenue
Rental revenue

11. Admin book management
Books
 ├── Add Book
 ├── Edit Book
 ├── Delete/Archive Book
 ├── Upload Images
 ├── Upload Videos
 ├── Add Physical Copies
 ├── Generate QR Codes
 ├── Print QR Labels
 └── View Inventory

 12. 20. Media storage
Do not store videos directly inside MongoDB.

12. Authentication
JWT
+
Refresh Tokens
+
bcrypt/Argon2 password hashing

13. API Structure
Use Rest API

14. Recommended technology stack
Frontend
Next.js + TypeScript
Next.js
TypeScript
Tailwind CSS
React Query
Zod


Backend
I recommend:
NestJS + TypeScript



15. Payment architecture
Since this is intended for Nigeria, I would design the payment layer so that it is gateway-independent.
PaymentService
      │
      ├── PaystackProvider
      ├── FlutterwaveProvider
      └── FutureProvider


16. Frontend pages
Public
/
 /books
 /books/rent
 /books/sale
 /books/:id
 /categories
 /about
 /contact
 /login
 /register

 Member
 /dashboard
/profile
/subscription
/subscription/plans
/rentals
/rentals/:id
/orders
/orders/:id
/cart
/notifications

Admin
/admin
/admin/books
/admin/books/new
/admin/books/:id
/admin/inventory
/admin/subscriptions
/admin/members
/admin/rentals
/admin/orders
/admin/payments
/admin/reports
/admin/settings
/admin/scanner

17. Staff scanner interface
This deserves its own application page.

        BOOK SCANNER

      ┌───────────────┐
      │               │
      │   CAMERA      │
      │               │
      │   SCANNING    │
      │               │
      └───────────────┘

          Scan QR Code

             OR

     Enter Inventory Code


     Atomic Habits
Copy: RBC-000023
Status: RENTED

Member:
John Doe

Due Date:
October 15, 2026

Condition:
GOOD

Staff then chooses:
[ CONFIRM RETURN ]
[ REPORT DAMAGE ]
[ MARK LOST ]


18. Security architecture

HTTPS
JWT
Refresh token rotation
Password hashing
RBAC
Input validation
Rate limiting
CORS
Helmet
MongoDB injection protection
Audit logging
Secure HTTP cookies
CSRF protection where applicable
File upload validation
File size limits
Image/video MIME validation

Admin endpoints must require:
Authentication
+
Role
+
Permission

19. Docker architecture
docker-compose.yml

services:

  frontend

  backend

  mongodb

  redis

  nginx


  20. Jenkins CI/CD architecture
  Developer
    │
    ▼
GitHub/GitLab
    │
    │ webhook
    ▼
 Jenkins
    │
    ├── Checkout
    │
    ├── Install dependencies
    │
    ├── Lint
    │
    ├── Unit tests
    │
    ├── Integration tests
    │
    ├── Security scan
    │
    ├── Build frontend
    │
    ├── Build backend
    │
    ├── Docker build
    │
    ├── Push images
    │
    └── Deploy
          │
          ▼
       Production


20. Docker image strategy

readers-bookclub-frontend
readers-bookclub-backend
Tag them:
readers-bookclub-backend:1.0.0
readers-bookclub-backend:latest
readers-bookclub-backend:${BUILD_NUMBER}


21. Git repository structure
readers-book-club/
│
├── apps/
│   │
│   ├── frontend/
│   │   ├── src/
│   │   ├── public/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── backend/
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── books/
│   │   │   ├── inventory/
│   │   │   ├── rentals/
│   │   │   ├── subscriptions/
│   │   │   ├── orders/
│   │   │   ├── payments/
│   │   │   ├── scans/
│   │   │   └── notifications/
│   │   ├── test/
│   │   ├── Dockerfile
│   │   └── package.json
│
├── infrastructure/
│   ├── docker/
│   ├── nginx/
│   └── scripts/
│
├── docs/
│
├── docker-compose.yml
├── Jenkinsfile
├── .gitignore
└── README.md


21. Development phases
Don't attempt to build everything simultaneously.

Phase 1 — Foundation
Authentication
Users
Roles
MongoDB
Frontend
Backend
Docker

Phase 2 — Book catalog
Books
Authors
Categories
Book copies
Images
Search
Filtering

Phase 3 — Inventory
Physical copies
Inventory codes
QR generation
Book status
Book condition
Inventory dashboard

Phase 4 — Subscription
Subscription plans
Membership
Payment
Activation
Expiry
Renewal
Rental limits

Phase 5  - Rental
Rental
Checkout
Due dates
Returns
Overdue
Late fees
Rental history

Phase 6 — Bookstore
Cart
Orders
Payments
Sales inventory
Order status
Delivery/pickup

Phase 7 — Scanning
Camera scanner
QR verification
Checkout scan
Return scan
Inventory scan
Scan audit

Phase 8 — Notifications
Email
SMS
In-app notifications
Scheduled reminders


Phase 9 — CI/CD
Git push
 ↓
Jenkins
 ↓
Test
 ↓
Build
 ↓
Docker
 ↓
Security scan
 ↓
Registry
 ↓
Deployment
 ↓
Health check


Phase 10 — Production hardening
Backups
Monitoring
Logging
Alerting
Rate limiting
Security testing
Load testing
Database indexes
Database backup restoration
Disaster recovery











