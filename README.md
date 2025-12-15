# Showers Auto Detailing Website

A modern, mobile-first auto detailing website built with Astro, React, Node.js, and PostgreSQL. Features include instant quote calculator, booking system, before/after gallery, reviews, and Square payment integration.

## Features

- **Mobile-First Design**: Optimized for all devices with bottom navigation bar
- **Instant Quote Calculator**: Two-question system for immediate price estimates
- **Before/After Gallery**: Interactive drag sliders to showcase transformations
- **Booking System**: Simple booking with calendar integration
- **Payment Processing**: Square integration for deposits and final payments
- **Review System**: Customer reviews with star ratings
- **Service Area Map**: Visual representation of coverage area
- **Notifications**: Email and/or SMS notifications for new bookings and quotes

## Tech Stack

### Frontend
- **Astro 5.0**: Lightning-fast static site generator
- **React 19**: Interactive components with Islands Architecture
- **Tailwind CSS 4**: Modern utility-first CSS framework

### Backend
- **Node.js + Express**: RESTful API server
- **PostgreSQL**: Reliable relational database
- **Square**: Payment processing
- **Brevo**: Email notifications (300/day free tier)
- **Telnyx**: SMS notifications (~$0.0025/msg)
- **JWT Authentication**: Secure admin authentication with refresh tokens
- **Rate Limiting**: Protection against abuse
- **Input Validation**: Secure data handling

### Deployment
- **Docker Compose**: Containerized deployment
- **Hetzner VPS**: Cost-effective hosting ($20-30/month)

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Git installed

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd showersautodetailing
```

2. **Run the setup script**
```bash
chmod +x setup.sh
./setup.sh
```

3. **Configure environment variables**

Edit the `.env` file with your actual values:
```bash
nano .env
```

Required configurations:
- `JWT_SECRET`: Generate with `openssl rand -hex 32`
- `SQUARE_*` credentials: See [docs/setup/square-setup.md](docs/setup/square-setup.md)
- `BREVO_API_KEY`: See [docs/setup/brevo-setup.md](docs/setup/brevo-setup.md)
- `TELNYX_*`: See [docs/setup/telnyx-setup.md](docs/setup/telnyx-setup.md)
- `GOOGLE_MAPS_API_KEY`: See [docs/setup/google-maps-setup.md](docs/setup/google-maps-setup.md)

4. **Start the application**
```bash
docker-compose up -d
```

5. **Create admin user**
```bash
curl -X POST http://localhost:3000/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "your_secure_password", "name": "Admin"}'
```

6. **Access the website**
- Frontend: http://localhost:4321
- Backend API: http://localhost:3000
- Health Check: http://localhost:3000/health

## Environment Variables

All environment variables are documented in `.env.example`. Copy this file to `.env` and update with your values.

For full documentation, deployment instructions, API reference, and troubleshooting, see the complete documentation in this README.

## Development

```bash
# Frontend (with hot reload)
npm run dev

# Backend (with auto-reload)
cd backend && npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

The application is designed to be deployed easily with Docker Compose on any VPS. Recommended hosting: Hetzner Cloud ($20-30/month).

See the deployment section below for detailed instructions.

## Project Structure

```
showersautodetailing/
├── backend/                  # Node.js backend
│   ├── config/              # Database configuration
│   ├── middleware/          # Auth, rate limiting, validation, notifications
│   ├── routes/              # API routes (auth, quotes, bookings, etc.)
│   ├── schema.sql           # Database schema
│   └── server.js            # Express server
├── src/                     # Astro frontend
│   ├── assets/images/       # Optimized local images
│   ├── components/          # React and Astro components
│   ├── layouts/             # Page layouts
│   ├── pages/               # Pages
│   └── styles/              # Global styles
├── docs/setup/              # Service setup guides
│   ├── developer-setup.md   # Local development setup
│   ├── production-setup.md  # Docker production deployment
│   ├── square-setup.md      # Square payment integration
│   ├── brevo-setup.md       # Email setup guide (Brevo)
│   ├── telnyx-setup.md      # SMS setup guide (Telnyx)
│   └── google-maps-setup.md # Maps API guide
├── public/                  # Static assets
├── .env.example             # Environment template
├── docker-compose.yml       # Docker services
└── setup.sh                 # Setup script
```

## License

This project is proprietary software for Showers Auto Detailing.
