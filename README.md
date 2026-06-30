# Production Ready Online Grievance Redressal System

A complete, production-ready, security-hardened public utility grievance redressing portal designed with a blend of government layout authority and high-end SaaS visuals.

---

## Folder Structure
```
/client
  ├── index.html                 # Stunning public home landing page
  ├── login.html                 # Login page supporting all roles and password recovery
  ├── register.html              # Citizen / NGO sign up portal with OTP verification
  ├── dashboard.html             # Route-guard redirection utility
  ├── complaints.html            # Main complaints tracker (raising, assignment, closure)
  ├── petition.html              # Petitions portal (voting signatures, auto-forwarding)
  ├── groups.html                # Discussion forums (likes, postings, replies)
  ├── feedback.html              # Citizen rating feedback form
  ├── profile.html               # Avatar configuration and name updates
  ├── admin/                     # Administrator workspace views
  ├── manager/                   # Department Manager dashboard
  ├── employee/                  # Field Officer dashboard
  ├── ngo/                       # NGO partner dashboard
  ├── citizen/                   # Citizen workspace dashboard
  ├── css/                       # Stylesheets (style.css, dashboard.css)
  └── js/                        # Core scripts (api.js, auth.js)
/server
  ├── controllers/               # MVC Controllers (auth, complaints, users, depts, reports, groups)
  ├── models/                    # MongoDB Mongoose models
  ├── routes/                    # API Routing pathways
  ├── middleware/                # Security filtering and auth checks
  ├── config/                    # Database setup configurations
  ├── uploads/                   # Media attachments folder
  ├── utils/                     # Email transporters, pdf generators, qr codes
  └── server.js                  # Node server main initialization point
vercel.json                      # Vercel monorepo deployment config
package.json                     # Node.js dependencies configuration
.env.example                     # Environment template
```

---

## Tech Stack
*   **Frontend**: HTML5, CSS3, Vanilla JavaScript, Bootstrap 5, AOS Animation Library, Chart.js, Font Awesome, Google Fonts
*   **Backend**: Node.js, Express.js, JWT Authentication (Header/Cookie), bcrypt, Multer, Nodemailer, Express-Validator
*   **Database**: MongoDB Atlas using Mongoose ORM
*   **Security Tools**: Helmet headers, Express-Rate-Limit, Express-Mongo-Sanitize

---

## Environment Variables
Create a `.env` file at the root containing:
```env
PORT=3000
JWT_SECRET=your_jwt_signature_key_12345
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/grievance?retryWrites=true&w=majority
EMAIL_USER=smtp_username@gmail.com
EMAIL_PASS=smtp_app_password
```

---

## Seeding Default Credentials
Upon database connection, the system automatically checks for and seeds default users:

*   **Administrator**
    *   Email: `admin@grievance.gov`
    *   Password: `Admin@123`
*   **Roads Department Manager**
    *   Email: `manager@roads.gov`
    *   Password: `Manager@123`
*   **Field Officer**
    *   Email: `employee@roads.gov`
    *   Password: `Employee@123`
*   **Citizen**
    *   Email: `citizen@gmail.com`
    *   Password: `Citizen@123`
*   **NGO Partner**
    *   Email: `ngo@gmail.com`
    *   Password: `NGO@123`

---

## Installation & Local Launch
1. Ensure Node.js (version 18+) and MongoDB are available.
2. Install packages:
   ```bash
   npm install
   ```
3. Set environment variables in `.env` (or let it run in mock email mode if SMTP is missing).
4. Run server:
   ```bash
   npm start
   ```
5. Navigate to `http://localhost:3000` in your web browser.

---

## Vercel Deployment Guide
To deploy this monorepo application to Vercel:
1. Connect this project to a GitHub repository.
2. In your Vercel Dashboard, select **New Project** and import the repository.
3. In Project Settings, ensure that the Framework Preset is set to **Other**.
4. Configure your **Environment Variables** (specifically `MONGODB_URI` and `JWT_SECRET`) within Vercel settings.
5. Click **Deploy**. Vercel will automatically read the `vercel.json` routing configuration and map the static `/client` assets alongside the Express serverless function endpoint.
