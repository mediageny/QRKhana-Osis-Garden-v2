# Deploy QRkhana to Render - Step by Step Guide

## What You Have
This folder contains a clean deployment package that's optimized for GitHub upload and Render deployment.

## ✅ Fixed Issues
- **Build Error**: Removed all logo/asset imports that caused "file not found" errors
- **Dependencies**: All build tools moved to production dependencies 
- **Commands**: Updated to use npx for reliable tool execution
- **Database SSL**: Fixed SSL/TLS connection errors for production PostgreSQL
- **Session Storage**: Configured session store with proper SSL settings

## Step 1: Upload to GitHub (Free)

### Create GitHub Repository
1. Go to [github.com](https://github.com) and sign in (or create free account)
2. Click the green "New" button (or + icon → New repository)
3. Repository name: `qrkhana-restaurant-system`
4. Select "Public" (required for free accounts)
5. Check "Add a README file"
6. Click "Create repository"

### Upload Files (Easy Method)
1. In your new GitHub repository, click "uploading an existing file"
2. Drag and drop ALL files from this `github-deploy` folder
3. In the commit message box, type: "Initial QRkhana restaurant system upload"
4. Click "Commit changes"

✅ **Success**: Your code is now on GitHub!

## Step 2: Create Database on Render

### Setup PostgreSQL Database
1. Go to [render.com](https://render.com) and create free account
2. Click "New +" → "PostgreSQL"
3. Settings:
   - **Name**: `qrkhana-database`
   - **Database**: `qrkhana`
   - **User**: `admin`
   - **Region**: Choose closest to your location
   - **Plan**: Free tier
4. Click "Create Database"
5. **IMPORTANT**: Copy the "External Database URL" from the database info page

## Step 3: Deploy Web Service

### Create Web Service
1. In Render dashboard, click "New +" → "Web Service"
2. Choose "Build and deploy from a Git repository"
3. Connect your GitHub account
4. Select your `qrkhana-restaurant-system` repository
5. Click "Connect"

### Configure Service
**Basic Settings:**
- **Name**: `qrkhana-restaurant`
- **Region**: Same as your database
- **Branch**: `main`
- **Runtime**: `Node`
- **Build Command**: `npm install && npm run build && npm run db:push`
- **Start Command**: `npm start`

### Environment Variables
Click "Advanced" and add these environment variables:

1. **DATABASE_URL**
   - Value: Paste the External Database URL you copied earlier
   
2. **NODE_ENV**
   - Value: `production`

3. **RENDER_EXTERNAL_URL** (Important!)
   - Value: `https://qrkhana-osis-garden.onrender.com`

### Deploy
1. Click "Create Web Service"
2. Wait 5-10 minutes for deployment
3. Your restaurant system will be live!

## Step 4: Access Your System

### Default Admin Login
- **URL**: Your Render app URL (shown in dashboard)
- **Admin Username**: `admin@osis#lkb`
- **Admin Password**: `osis#admin@gomar`

### QR Code Access
- Restaurant tables: `your-app-url.com/table/1` (numbers 1-14)
- Bar rooms: `your-app-url.com/table/lika-cottage` or `/table/bali-cottage`

## Cost Breakdown

### Free Plan (Good for testing)
- **Web Service**: Free (limited hours)
- **Database**: Free PostgreSQL
- **Total**: $0/month

### Production Plan (Recommended)
- **Web Service**: $7/month
- **Database**: Free PostgreSQL  
- **Total**: $7/month (₹588)

## Troubleshooting

### If QR codes show localhost URLs:
1. **CRITICAL**: Add `RENDER_EXTERNAL_URL` environment variable
2. Value: `https://qrkhana-osis-garden.onrender.com`
3. Redeploy service

### If admin keeps logging out:
1. Check DATABASE_URL includes SSL parameters
2. Wait 2-3 minutes for session table creation
3. Clear browser cookies and try again

### If dashboard shows 401 errors:
1. Login again (sessions may have reset after deployment)
2. Check that all environment variables are set
3. Try hard refresh (Ctrl+F5)

## Next Steps

1. **Update Menu**: Login to admin panel → Menu Management
2. **Generate QR Codes**: Admin panel → Tables & QR Codes
3. **Test Orders**: Use QR codes to place test orders
4. **Check Analytics**: View sales data in admin dashboard

## Support

For technical support or customizations, contact **MEDIAGENY SOFTWARE SOLUTIONS** at [mediageny.com](https://www.mediageny.com)

---

**Your QRkhana Restaurant Management System is ready for deployment! 🚀**