# Grove Capital Funding — Full Stack Business Funding Platform

**Live Site:** https://www.grovecapitalfunding.com

A complete ground-up redesign and full stack rebuild of a business funding platform for Grove Capital Funding LLC. This project evolved from a single-page static HTML site into a multi-page production application with a custom serverless backend, secure file storage, and a multi-section funding application form handling sensitive financial data.

---

## Project Type

Freelance Client Project — Full Stack Web Development

---

## What Changed From V1

The original site was a single HTML page that redirected users to an external JotForm link for applications. The redesign replaced this entirely with:

- A custom multi-section application form built from scratch
- A Cloudflare Worker serverless backend replacing JotForm's hosting
- Cloudflare R2 object storage for secure document uploads
- JotForm API integration for client-side submission notifications
- A complete visual redesign with new branding, animations, and responsive layout

---

## Tech Stack

### Frontend
- **HTML5** — Semantic multi-page markup
- **CSS3** — Custom design system with CSS variables, animations, and full responsive layout
- **Vanilla JavaScript** — No frameworks, all custom built

### Backend
- **Cloudflare Workers** — Serverless backend handling form submissions and file uploads
- **Cloudflare R2** — Object storage for uploaded documents
- **JotForm API** — Form submission data forwarded to client's JotForm dashboard for notifications

### Infrastructure
- **Cloudflare Pages** — Static site hosting
- **Cloudflare Access** — Zero trust access control
- **Secret management** — All secrets stored as Cloudflare Worker environment secrets, never in source code

---

## Pages

- **index.html** — Main landing page with hero, funding calculator, services, testimonials, about, and contact sections
- **form.html** — Multi-section business funding application with signature pads, file uploads, and real-time validation
- **terms.html** — Privacy Policy and Terms and Conditions

---

## Features

### Landing Page
- Animated hero section with scroll-triggered stat counters
- Interactive funding calculator with daily and weekly payment modes and factor rate slider
- Services section with hover animations
- Video background sections for How It Works and Testimonials
- About section with image lightbox modal
- Contact section with social media links
- Scroll progress bar
- Mobile sidebar navigation
- Active navigation state tracking on scroll

### Application Form
- Multi-section form with real-time validation
- Dual owner support with optional second owner section
- Canvas-based signature pads for both owners supporting mouse and touch input
- SSN fields with show/hide toggle
- Drag and drop file upload zone with file preview and removal
- Form progress bar tracking required field completion
- Agreement and authorization section with custom styled checkbox
- Success modal on submission
- Default signing date auto-populated to current date

### Backend
- Serverless form submission handling via Cloudflare Worker
- File uploads stored in Cloudflare R2 for application processing
- Form data forwarded to JotForm API for client notifications
- Submission metadata stored temporarily alongside uploaded documents

---

## Funding Services Offered

- Working Capital
- Business Lines of Credit
- Equipment Financing
- SBA Loans
- Term Loans
- Revenue Based Financing
- Merchant Cash Advance
- Non-Collateralized Lending
- Same Day Funding
- Funding from $10,000 to $500,000

---

## Development Notes

- No frontend frameworks used — fully custom vanilla HTML, CSS, and JavaScript
- Mobile first responsive design across all pages
- All third party secrets and API keys managed through Cloudflare Worker environment secrets
- Site migrated from Digital Ocean to Cloudflare Pages with domain transferred from GoDaddy

---

## Project Structure

groveCapital/
- assets/images/
- grove-capital-form/
- index.html
- form.html
- form-handler.js
- form-styles.css
- script.js
- styles.css
- terms.html
- terms.css
- terms.js
- .gitignore

---

## Author

**Developed by:** Independent Freelance Developer
**Client:** Grove Capital Funding LLC
**Year:** 2024 - 2025

---

## License

This project was built for a private client. All business content, branding, and assets belong to Grove Capital Funding LLC. The codebase is not open source and is displayed here for portfolio purposes only.

---

*Built with care for a real business serving real people.*