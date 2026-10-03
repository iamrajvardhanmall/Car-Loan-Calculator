# 🚀 Complete Render.com Free Deployment Guide
### Car Loan Microservices & Django Web Application

This comprehensive guide walks you through deploying the **Car Loan Calculator** to **[Render.com](https://render.com)** completely **for free**, while guaranteeing that all features work identically in production as they do on `localhost`.

---

## 📋 Table of Contents
1. [Architecture Overview & Free Tier Details](#1-architecture-overview--free-tier-details)
2. [Deployment Model Selection](#2-deployment-model-selection)
3. [Step 1: Commit & Push Changes to GitHub](#step-1-commit--push-changes-to-github)
4. [Step 2: Provision a Free PostgreSQL Database](#step-2-provision-a-free-postgresql-database)
5. [Step 3: Deploy the Django Web Service](#step-3-deploy-the-django-web-service)
6. [Step 4: Configure Environment Variables (.env Mapping)](#step-4-configure-environment-variables-env-mapping)
7. [Step 5: Create a Django Admin / Superuser](#step-5-create-a-django-admin--superuser)
8. [Step 6: Configure Google OAuth 2.0 (Optional)](#step-6-configure-google-oauth-20-optional)
9. [Step 7: Deploy Independent Microservices (Optional)](#step-7-deploy-independent-microservices-optional)
10. [Bonus: Keep Your Free Service Awake (Zero Cold Starts)](#bonus-keep-your-free-service-awake-zero-cold-starts)
11. [Troubleshooting & Verification Checklist](#troubleshooting--verification-checklist)

---

## 1. Architecture Overview & Free Tier Details

Render provides generous free resources:
- **Free Web Services**: 750 free instance hours per month (enough to run 1 service 24/7). Spun down after 15 minutes of inactivity; wakes up automatically within 30-50 seconds upon receiving an incoming HTTP request.
- **Free PostgreSQL**: Available for 90 days on Render, or you can connect a **permanent free-tier PostgreSQL** database from providers like **[Neon.tech](https://neon.tech)** or **[Supabase.com](https://supabase.com)** via `DATABASE_URL`.
- **Static Assets & Media**: Served instantly with built-in **WhiteNoise** compression and caching without needing AWS S3.

---

## 2. Deployment Model Selection

The Car Loan project supports two deployment architectures:

| Feature | **Model 1: All-In-One (Recommended)** | **Model 2: Full Microservices** |
| :--- | :--- | :--- |
| **Description** | Single Django Web Service utilizing built-in local engines for Gemini AI Valuation and PDF Generation. | Django Web App + AI Valuation FastAPI + PDF FastAPI (3 web services). |
| **Render Services Used** | **1 Free Web Service** + 1 Database | **3 Free Web Services** + 1 Database |
| **Free Tier Fit** | ⭐️⭐️⭐️⭐️⭐️ **100% Free** (stays within 750 free hours) | ⭐️⭐️⭐️ Consumes free hours faster across 3 services |
| **Setup Complexity** | Very Low (takes 5 minutes) | Medium (requires configuring 3 services) |
| **Recommendation** | **Best for personal portfolios, college projects, and live demos.** | Best for demonstrating microservices architecture in enterprise portfolios. |

> [!TIP]
> **Start with Model 1**. It delivers 100% of the functionality (loan calculations, comparison, amortization schedules, Gemini AI car appraisal, PDF summaries, and Google OAuth) with zero setup headaches!

---

## Step 1: Commit & Push Changes to GitHub

Ensure all recent production enhancements (`whitenoise`, `dj-database-url`, `gunicorn`, and updated settings) are committed and pushed to your GitHub repository:

```powershell
# Open terminal in the CarLoan directory
cd c:\Users\Lenovo\OneDrive\Music\CarLoanCalculator\CarLoan

# Check status
git status

# Add and commit the changes
git add .
git commit -m "feat: configure gunicorn, whitenoise, and cloud database settings for Render"

# Push to your active branch (e.g., Raj or main)
git push origin Raj
```

*(If you prefer to deploy from the `main` branch, merge `Raj` into `main` and push).*

---

## Step 2: Provision a Free PostgreSQL Database

You have two choices for your database:

### Option A: Render Managed PostgreSQL (Easiest)
1. Log in to your **[Render Dashboard](https://dashboard.render.com/)**.
2. Click **New +** → **PostgreSQL**.
3. Configure the following:
   - **Name**: `carloan-db`
   - **Database**: `car_loan_db`
   - **User**: `carloan_user`
   - **Region**: Choose the region closest to you (e.g., *Singapore*, *Frankfurt*, or *Ohio*).
   - **PostgreSQL Version**: `15` or `16`
   - **Instance Type**: Select **Free**.
4. Click **Create Database**.
5. After creation, locate the **Connections** section:
   - Copy the **Internal Database URL** (e.g., `postgresql://carloan_user:password@dpg-xxxxx-a/car_loan_db`).
   - *(Note: Use the Internal Database URL when connecting from a Render Web Service for faster performance and free internal bandwidth).*

### Option B: Neon.tech / Supabase (Permanent Free Tier)
1. Create a free PostgreSQL database on **[Neon.tech](https://neon.tech)** or **[Supabase.com](https://supabase.com)**.
2. Copy the provided connection string URI (starting with `postgresql://...`).

---

## Step 3: Deploy the Django Web Service

1. In your **Render Dashboard**, click **New +** → **Web Service**.
2. Connect your GitHub repository: `Car-loan-calculator` (or `iamrajvardhanmall/Car-loan-calculator`).
3. Fill in the deployment details:

| Setting | Value to Enter | Note |
| :--- | :--- | :--- |
| **Name** | `carloan-web` (or any unique name) | Your URL will be `https://<name>.onrender.com` |
| **Region** | Same region as your database | Minimizes latency |
| **Branch** | `Raj` (or `main`) | The branch containing your latest commits |
| **Root Directory** | `loan_calculator` | ⚠️ **Crucial**: Do NOT leave empty. Django lives here! |
| **Runtime** | `Python 3` | Native Python runtime |
| **Build Command** | `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate` | Installs deps, bundles CSS/JS, and runs DB migrations |
| **Start Command** | `gunicorn loan_calculator.wsgi:application` | Production WSGI HTTP server |
| **Instance Type** | **Free** | $0/month |

---

## Step 4: Configure Environment Variables (.env Mapping)

Before clicking Deploy (or under the **Environment** tab of your service), add your environment variables. 

Here is the exact mapping between your local `.env` file and what goes into Render:

| Environment Variable | Recommended Render Production Value | Description |
| :--- | :--- | :--- |
| `DEBUG` | `False` | Disables debug mode for production security |
| `SECRET_KEY` | `django-insecure-prod-c4r-l04n-s3cr3t-k3y-99!` | Set a strong random secret key |
| `DATABASE_URL` | *`postgresql://carloan_user:pwd@dpg-xxx-a/car_loan_db`* | Paste the **Internal Database URL** from Step 2 |
| `ALLOWED_HOSTS` | `.onrender.com,localhost,127.0.0.1` | Allows Render subdomains and local fallbacks |
| `CSRF_TRUSTED_ORIGINS` | `https://carloan-web.onrender.com` | ⚠️ **Replace with your exact Render web service URL** |
| `GOOGLE_GEMINI_API_KEY` | `AIzaSyAUx1weT_9hcBfSTZPvKqpTXgR3_EU4_hg` | Your Google Gemini API key for AI Vehicle Valuation |
| `SOCIAL_AUTH_GOOGLE_OAUTH2_KEY` | *(Your Google Client ID)* | Optional for Google OAuth Sign-In |
| `SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET` | *(Your Google Client Secret)* | Optional for Google OAuth Sign-In |
| `SOCIAL_AUTH_GOOGLE_OAUTH2_REDIRECT_URI`| `https://carloan-web.onrender.com/social-auth/complete/google-oauth2/` | Optional for Google OAuth Redirect |
| `VALUATION_SERVICE_URL` | *(Leave empty for Model 1)* | Uses Django's built-in Gemini engine |
| `PDF_SERVICE_URL` | *(Leave empty for Model 1)* | Uses Django's local renderer |

> [!IMPORTANT]
> Make sure `CSRF_TRUSTED_ORIGINS` matches your actual Render URL with `https://`. For example, if your service is named `carloan-web`, the URL will be `https://carloan-web.onrender.com`.

Click **Create Web Service** (or **Save Changes**). Render will start building the project, running migrations, and launching Gunicorn!

---

## Step 5: Create a Django Admin / Superuser

Once the deployment completes and status turns **Live**:

1. In the Render service navigation menu, click **Shell**.
2. Run the following command inside the shell:
   ```bash
   python manage.py createsuperuser
   ```
3. Enter your desired admin username, email, and password.
4. Open `https://your-service-name.onrender.com/admin/` in your browser and log in with your new credentials!

---

## Step 6: Configure Google OAuth 2.0 (Optional)

If you use **Sign in with Google**:
1. Open the **[Google Cloud Console](https://console.cloud.google.com/)**.
2. Navigate to **APIs & Services** → **Credentials**.
3. Select your OAuth 2.0 Client ID.
4. Under **Authorized JavaScript origins**, add:
   - `https://your-service-name.onrender.com`
5. Under **Authorized redirect URIs**, add:
   - `https://your-service-name.onrender.com/social-auth/complete/google-oauth2/`
6. Click **Save**.

---

## Step 7: Deploy Independent Microservices (Optional)

If you wish to run the full microservices architecture on Render:

### A. Deploy AI Vehicle Valuation Microservice
1. Click **New +** → **Web Service** → Connect `Car-loan-calculator`.
2. Settings:
   - **Name**: `carloan-valuation-service`
   - **Root Directory**: `services/ai_valuation_service`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: `Free`
3. Environment Variables:
   - `GOOGLE_GEMINI_API_KEY`: *(Your Gemini API key)*
4. Once live, copy its **Internal URL** (e.g. `http://carloan-valuation-service:10000/api/estimate`) or external URL.

### B. Deploy PDF Generator Microservice
1. Click **New +** → **Web Service** → Connect `Car-loan-calculator`.
2. Settings:
   - **Name**: `carloan-pdf-service`
   - **Root Directory**: `services/pdf_service`
   - **Runtime**: `Docker` *(Recommended so system libraries for WeasyPrint install cleanly via Dockerfile)*
   - **Plan**: `Free`
3. Once live, copy its URL (e.g. `http://carloan-pdf-service:10000/api/generate-pdf`).

### C. Connect Microservices to Django
In your `carloan-web` service settings, add:
- `VALUATION_SERVICE_URL`: `https://carloan-valuation-service.onrender.com/api/estimate` (or internal URL)
- `PDF_SERVICE_URL`: `https://carloan-pdf-service.onrender.com/api/generate-pdf` (or internal URL)

---

## Bonus: Keep Your Free Service Awake (Zero Cold Starts)

Render free instances spin down after 15 minutes of inactivity. To keep your website responsive 24/7 without delays:

1. Sign up for a free account at **[UptimeRobot.com](https://uptimerobot.com)** or **[cron-job.org](https://cron-job.org)**.
2. Create a new **HTTP(s) Monitor**:
   - **URL**: `https://your-service-name.onrender.com/metrics` (or `https://your-service-name.onrender.com/`)
   - **Monitoring Interval**: Every `10 minutes`
3. UptimeRobot will ping your site every 10 minutes, preventing Render from spinning it down!

---

## Troubleshooting & Verification Checklist

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| **`403 Forbidden: CSRF verification failed`** | `CSRF_TRUSTED_ORIGINS` is missing or does not have `https://` | In Render Environment Variables, set `CSRF_TRUSTED_ORIGINS=https://your-service.onrender.com` |
| **CSS or styling missing on live site** | Static files were not collected | Ensure `Build Command` includes `python manage.py collectstatic --noinput`. WhiteNoise handles the rest. |
| **Database connection error** | Wrong database URL or host unreachable | Verify that `DATABASE_URL` is set to the **Internal Database URL** provided by Render PostgreSQL. |
| **`SocialAuthBaseException` on Google login** | Google OAuth redirect URI mismatch | Ensure `SOCIAL_AUTH_GOOGLE_OAUTH2_REDIRECT_URI` matches the Authorized redirect URI in Google Cloud Console. |
| **Build fails with `cannot open manage.py`** | Incorrect Root Directory | In Render settings, verify that **Root Directory** is set to `loan_calculator`. |

---

### 🎉 Your Car Loan Calculator is Now Live on the Cloud!
You now have a fast, cloud-hosted Django financial application running 24/7 with zero hosting costs.