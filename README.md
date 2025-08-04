# QRkhana Restaurant Management System

A comprehensive restaurant management platform powered by QRkhana Software, designed to streamline dining experiences through innovative digital solutions.

## Features

- **QR Code Ordering**: Customers scan QR codes to access menus and place orders
- **Real-time Kitchen/Bar Dashboards**: Live order management with status updates
- **Admin Dashboard**: Complete restaurant management with analytics
- **Dual Service Types**: Separate restaurant and bar menus
- **Order Pause System**: Control order acceptance during rush hours
- **Analytics & Reports**: Sales tracking and payment method breakdowns
- **Mobile Optimized**: Responsive design for all devices

## Technologies

- **Frontend**: React 18 with TypeScript, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time**: WebSocket connections
- **UI Components**: Radix UI, shadcn/ui

## Quick Deploy to Render

1. **Fork/Clone this repository**
2. **Create a new Web Service on Render**
3. **Connect your GitHub repository**
4. **Set up environment variables**:
   - `DATABASE_URL`: PostgreSQL connection string
   - `NODE_ENV`: production
5. **Deploy automatically**

## Environment Variables

```
DATABASE_URL=postgresql://username:password@host:port/database
NODE_ENV=production
```

## Installation & Development

```bash
# Install dependencies
npm install

# Set up database
npm run db:push

# Start development server
npm run dev
```

## Admin Access

Default admin credentials:
- Username: `admin@osis#lkb`
- Password: `osis#admin@gomar`

## QR Code Tables

The system includes pre-configured tables:
- **Restaurant**: Table No. 1-6, Lower Table 1-4, Upper Table 1-4
- **Bar**: LIKA COTTAGE, BALI COTTAGE

## Support

Built by **MEDIAGENY SOFTWARE SOLUTIONS** for Osie Garden.

For support, visit: [mediageny.com](https://www.mediageny.com)