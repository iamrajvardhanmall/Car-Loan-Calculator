# 🚗 Car Loan Calculator and Value Estimator
## Comprehensive Technical Documentation & Architecture Reference Manual

---

### Document Control & Metadata
- **Project Name:** Car Loan Calculator and Value Estimator
- **Repository:** [iamrajvardhanmall/Car-Loan-Calculator](https://github.com/iamrajvardhanmall/Car-Loan-Calculator.git)
- **Live Production URL:** [https://carloan-web.onrender.com/](https://carloan-web.onrender.com/)
- **Core Stacks:** Django 4.2 · FastAPI · Google Gemini 2.0 Flash · WeasyPrint 60.2 · PostgreSQL 15
- **Cloud & DevOps:** Docker Compose · Kubernetes (HPA) · Terraform (AWS) · Prometheus · Grafana · GitHub CI/CD Webhooks

---

## 📑 Table of Contents
1. [Executive Summary & System Inception](#1-executive-summary--system-inception)
2. [High-Level System Architecture](#2-high-level-system-architecture)
   - 2.1 Microservices Topology & Data Flow
   - 2.2 Dual Operating Modes (Resilience Pattern)
3. [Core Microservices & Subsystems](#3-core-microservices--subsystems)
   - 3.1 Main Web Application & Financial Gateway (Django 4.2)
   - 3.2 AI Vehicle Valuation Microservice (FastAPI + Gemini 2.0 Flash)
   - 3.3 PDF Generation Microservice (FastAPI + WeasyPrint)
   - 3.4 Relational Database Microservice (PostgreSQL 15)
4. [Financial Mathematics & Algorithmic Engines](#4-financial-mathematics--algorithmic-engines)
   - 4.1 Fixed-Rate Loan Amortization (Annuity Formula)
   - 4.2 Credit-Score Risk Matrix
   - 4.3 Total Cost of Ownership (TCO) Model
   - 4.4 Prepayment & Early Payoff Compound Simulation
   - 4.5 Debt-to-Income (DTI) & Affordability Rules (28/36 Rule)
   - 4.6 Multimodal AI & Algorithmic Depreciation Engine
5. [Database Schema & Data Model Deep Dive](#5-database-schema--data-model-deep-dive)
6. [User Interface & Page-by-Page Routing](#6-user-interface--page-by-page-routing)
7. [DevOps & Cloud-Native Infrastructure (The 6 Pillars)](#7-devops--cloud-native-infrastructure-the-6-pillars)
   - 7.1 Docker & Multi-Stage Containerization
   - 7.2 Kubernetes Orchestration & Horizontal Pod Autoscaling (HPA)
   - 7.3 Infrastructure as Code via Terraform on AWS
   - 7.4 Time-Series Observability with Prometheus
   - 7.5 Real-Time Operational Dashboards with Grafana
   - 7.6 Continuous Deployment via GitHub Webhooks
   - 7.7 Concurrent Traffic Generation & Stress Testing (`load_test.py`)
8. [Configuration & Environment Variables Directory](#8-configuration--environment-variables-directory)
9. [Deployment & Operations Runbook](#9-deployment--operations-runbook)
10. [Security Posture, Error Handling & Production Hardening](#10-security-posture-error-handling--production-hardening)
11. [Troubleshooting & Frequently Asked Questions (FAQ)](#11-troubleshooting--frequently-asked-questions-faq)

---

## 1. Executive Summary & System Inception

**Car Loan Calculator and Value Estimator** is an end-to-end automotive financial intelligence and vehicle appraisal platform. While typical financial calculators compute only Equated Monthly Installments (EMI) based on raw numbers, this platform provides **comprehensive lifetime financial forecasting** and **AI-driven market valuations**.

### Core Problem Solved
1. **Financial Myopia**: Traditional calculators omit mandatory ancillary costs (sales tax, registration, documentation fees, insurance, maintenance, fuel, and warranty), blinding consumers to the true financial liability.
2. **Opaque Used-Car Appraisals**: Used-car valuation is traditionally manual, inconsistent, and subjective. This platform pairs **Google Gemini 2.0 Flash multimodal computer vision** with a **deterministic 5-tier algorithmic depreciation engine** to appraise vehicles from structured specifications and photos.
3. **Monolithic Compute Bottlenecks**: Heavy multimodal AI inference and memory-intensive PDF layout rendering (via WeasyPrint/Cairo/Pango) can freeze monolithic web runtimes. This system decouples these tasks into dedicated, independently scalable FastAPI microservices.

---

## 2. High-Level System Architecture

### 2.1 Microservices Topology & Data Flow

```mermaid
graph TD
    User([Client / Web Browser]) -->|HTTP :8000| DjangoGateway[Django 4.2 Web App & Gateway]

    subgraph Relational Storage
        DjangoGateway -->|TCP :5432| Postgres[(PostgreSQL 15 Alpine)]
    end

    subgraph Distributed Microservices
        DjangoGateway -.->|POST /api/estimate :5001| AIService[AI Valuation Service - FastAPI]
        DjangoGateway -.->|POST /api/generate-pdf :5002| PDFService[PDF Generation Service - FastAPI]
        AIService -->|REST HTTPS| Gemini[Google Gemini 2.0 Flash API]
    end

    subgraph Observability Pipeline
        Prometheus[Prometheus Server :9090] -->|Scrape /metrics| DjangoGateway
        Prometheus -->|Scrape /metrics| AIService
        Prometheus -->|Scrape /metrics| PDFService
        Grafana[Grafana Dashboard :3000] -->|Query| Prometheus
    end

    subgraph Automated CI/CD
        GitHubPush[GitHub Push Event] -->|HMAC-SHA256 :9000| WebhookServer[FastAPI Webhook Server]
        WebhookServer -->|Git pull & docker compose up| DockerDaemon[Docker Host Engine]
    end
```

### 2.2 Dual Operating Modes (Resilience Pattern)

The platform is designed with an automatic **graceful degradation pattern**:

| Mode | Trigger Condition | Valuation Engine | PDF Engine |
|---|---|---|---|
| **Microservices Mode** | `VALUATION_SERVICE_URL` & `PDF_SERVICE_URL` defined | Remote FastAPI on port `5001` (Gemini AI + Fallback) | Remote FastAPI on port `5002` (WeasyPrint) |
| **All-in-One Fallback Mode** | Service URLs empty or remote microservices unreachable | Django in-process [estimate_market_value](file:///c:/Users/Lenovo/OneDrive/Music/CarLoanCalculator/CarLoan/loan_calculator/car_loan/views.py#L135) | Django in-process [WeasyPrint HTML](file:///c:/Users/Lenovo/OneDrive/Music/CarLoanCalculator/CarLoan/loan_calculator/car_loan/views.py#L631) |

---

## 3. Core Microservices & Subsystems

### 3.1 Main Web Application & Financial Gateway
- **Path:** [`loan_calculator/`](file:///c:/Users/Lenovo/OneDrive/Music/CarLoanCalculator/CarLoan/loan_calculator/)
- **Technology:** Python 3.11, Django 4.2, Gunicorn, WhiteNoise, `dj-database-url`, `psycopg2-binary`
- **Internal Port:** `8000`
- **Responsibilities:**
  - Serves dynamic UI via Django Templates and Bootstrap 5.
  - User identity, session management, and Google OAuth2 authentication.
  - Executes core financial algorithms (amortization, credit score risk tiering, DTI).
  - Routes requests downstream to the AI Valuation and PDF microservices.
  - Collects and exposes Prometheus application metrics at `/metrics`.

### 3.2 AI Vehicle Valuation Microservice
- **Path:** [`services/ai_valuation_service/`](file:///c:/Users/Lenovo/OneDrive/Music/CarLoanCalculator/CarLoan/services/ai_valuation_service/)
- **Technology:** FastAPI, Uvicorn, Pydantic, Prometheus FastApi Instrumentator
- **Internal Port:** `5001`
- **REST Endpoints:**
  - `GET /health` → Returns `{"status": "healthy", "service": "ai_valuation_service"}`
  - `POST /api/estimate` → Performs vehicle appraisal
  - `GET /metrics` → Exposes request counts and latency histograms
- **Payload Schema:**
  ```json
  {
    "mode": "manual" | "image",
    "make": "Toyota",
    "model": "Camry",
    "year": 2021,
    "mileage_km": 45000,
    "condition": "good",
    "city": "Mumbai",
    "features": ["Sunroof", "Leather Seats", "Navigation"],
    "images": ["<base64-encoded-image-data>"]
  }
  ```
- **Response Schema:**
  ```json
  {
    "success": true,
    "text": "Estimated Value: ₹1,120,000\n\n1. Condition Assessment...",
    "confidence": 88,
    "estimated_value": 1120000,
    "condition": "good",
    "engine_used": "gemini_2.0_flash" | "algorithmic_fallback"
  }
  ```

### 3.3 PDF Generation Microservice
- **Path:** [`services/pdf_service/`](file:///c:/Users/Lenovo/OneDrive/Music/CarLoanCalculator/CarLoan/services/pdf_service/)
- **Technology:** FastAPI, Jinja2, WeasyPrint 60.2, Cairo, Pango, HarfBuzz
- **Internal Port:** `5002`
- **REST Endpoints:**
  - `GET /health` → Liveness check
  - `POST /api/generate-pdf` → Ingests loan summary JSON and returns high-resolution A4 PDF
  - `GET /metrics` → Exposes PDF generation latency and count metrics

### 3.4 Relational Database Microservice
- **Image:** `postgres:15-alpine`
- **Port:** `5432`
- **Database:** `Car_Loan`
- **Volume:** `postgres_data:/var/lib/postgresql/data`

---

## 4. Financial Mathematics & Algorithmic Engines

### 4.1 Fixed-Rate Loan Amortization (Annuity Formula)
Implemented in [calculate_loan_metrics](file:///c:/Users/Lenovo/OneDrive/Music/CarLoanCalculator/CarLoan/loan_calculator/car_loan/views.py#L109):
$$r = \frac{\text{Annual Interest Rate}}{12 \times 100}, \quad n = \text{Term in Months}, \quad P = \text{Loan Principal}$$

$$\text{Monthly EMI} = \frac{P \times r \times (1 + r)^n}{(1 + r)^n - 1}$$
$$\text{Total Payment} = \text{Monthly EMI} \times n$$
$$\text{Total Lifetime Interest} = \text{Total Payment} - P$$

### 4.2 Credit-Score Risk Matrix
Implemented in [calculate_credit_score_impact](file:///c:/Users/Lenovo/OneDrive/Music/CarLoanCalculator/CarLoan/loan_calculator/car_loan/views.py#L94):
$$\text{Effective Rate} = \text{Base Interest Rate} + \Delta_{\text{Credit Score}}$$

| Credit Score Tier | Rating Classification | Rate Adjustment ($\Delta$) |
|:---:|:---:|:---:|
| **$\ge 780$** | Super-Prime | **-0.50%** (Discount) |
| **$740 - 779$** | Prime | **-0.25%** (Discount) |
| **$700 - 739$** | Near-Prime | **0.00%** (Baseline) |
| **$660 - 699$** | Standard | **+0.50%** (Penalty) |
| **$620 - 659$** | Sub-Prime | **+1.00%** (Penalty) |
| **$< 620$** | Deep Sub-Prime | **+2.00%** (Penalty) |

### 4.3 Total Cost of Ownership (TCO) Model
$$\text{TCO} = \text{Vehicle Purchase Price} + \text{Lifetime Interest} + (\text{Monthly Insurance} \times n) + (\text{Monthly Maintenance} \times n) + (\text{Monthly Fuel} \times n) + \text{Extended Warranty}$$

### 4.4 Prepayment & Early Payoff Compound Simulation
Implemented in [early_payoff_view](file:///c:/Users/Lenovo/OneDrive/Music/CarLoanCalculator/CarLoan/loan_calculator/car_loan/views.py#L737):
For each month $m \in [1, n]$:
1. $\text{Interest}_m = \text{Balance}_{m-1} \times r$
2. $\text{Payment}_m = \text{Original EMI} + \text{Extra Payment (if scheduled)}$
3. $\text{Principal}_m = \min(\text{Payment}_m - \text{Interest}_m, \text{Balance}_{m-1})$
4. $\text{Balance}_m = \text{Balance}_{m-1} - \text{Principal}_m$
5. Loop terminates early when $\text{Balance}_m \le 0$, yielding $\text{Months Saved} = n - m_{\text{final}}$ and $\text{Interest Saved} = \text{Original Interest} - \sum \text{Interest}_m$.

### 4.5 Debt-to-Income (DTI) & Affordability Rules (28/36 Rule)
Implemented in [budget_analyzer_view](file:///c:/Users/Lenovo/OneDrive/Music/CarLoanCalculator/CarLoan/loan_calculator/car_loan/views.py#L794):
- **Front-End Rule (28% Max Auto Expense):**
  $$\text{Max Recommended Payment} = \text{Monthly Gross Income} \times 0.28$$
- **Back-End Rule (Total DTI Ratio):**
  $$\text{DTI} = \frac{\text{Existing Debts} + \text{Proposed Car Payment}}{\text{Monthly Income}} \times 100$$
  - $\text{DTI} \le 36\%$: **Good** (Healthy capacity)
  - $36\% < \text{DTI} \le 43\%$: **Warning** (Elevated risk)
  - $\text{DTI} > 43\%$: **Critical** (High risk of default)

### 4.6 Multimodal AI & Algorithmic Depreciation Engine
Implemented in [estimate_market_value](file:///c:/Users/Lenovo/OneDrive/Music/CarLoanCalculator/CarLoan/services/ai_valuation_service/main.py#L83):
$$\text{Estimated Value} = \text{Base Price} \times (0.88)^{\text{Age}} \times \left(1 - \min\left(\frac{\text{Mileage}}{250000}, 0.60\right)\right) \times M_{\text{condition}} \times M_{\text{features}} \times M_{\text{city}}$$
- **Condition Multipliers ($M_{\text{condition}}$):** Excellent ($1.12$), Good ($1.00$), Fair ($0.90$), Poor ($0.75$).
- **Features Bonus ($M_{\text{features}}$):** $1 + \min(\text{Count} \times 0.02, 0.12)$.
- **Regional Multipliers ($M_{\text{city}}$):** Mumbai ($1.12$), Delhi ($1.10$), Bengaluru ($1.08$), Chennai ($1.05$), Hyderabad ($1.04$), Pune ($1.03$), Kolkata ($1.02$), Other ($0.95$).

---

## 5. Database Schema & Data Model Deep Dive

```mermaid
erDiagram
    User ||--o{ LoanCalculation : "calculates"
    User ||--o{ SavedCalculation : "saves"
    User ||--o{ LoanComparison : "compares"
    User ||--o{ EarlyPayoff : "simulates"
    User ||--o{ MonthlyBudget : "analyzes"
    LoanCalculation ||--o{ EarlyPayoff : "referenced by"

    LoanCalculation {
        int id PK
        int user_id FK
        decimal vehicle_price
        decimal down_payment
        int loan_term
        decimal interest_rate
        decimal monthly_payment
        decimal total_interest
        decimal total_payment
        datetime calculation_date
    }

    SavedCalculation {
        int id PK
        int user_id FK
        decimal vehicle_price
        decimal down_payment
        decimal trade_in
        decimal sales_tax
        decimal doc_fee
        decimal registration_fee
        int loan_term
        decimal interest_rate
        decimal monthly_payment
        int credit_score
        decimal insurance_cost
        decimal maintenance_cost
        decimal fuel_cost
        decimal extended_warranty
        datetime created_at
    }

    LoanComparison {
        int id PK
        int user_id FK
        string name
        decimal vehicle_price
        decimal down_payment
        int loan_term
        decimal interest_rate
        decimal monthly_payment
        decimal total_cost
        datetime created_at
    }

    EarlyPayoff {
        int id PK
        int user_id FK
        int loan_calculation_id FK
        decimal extra_payment
        string payment_frequency
        int start_month
        int months_saved
        decimal interest_saved
        datetime created_at
    }

    MonthlyBudget {
        int id PK
        int user_id FK
        decimal monthly_income
        decimal existing_debts
        decimal monthly_expenses
        decimal max_recommended_payment
        decimal debt_to_income_ratio
        string budget_status
        datetime created_at
    }

    ContactQuery {
        int id PK
        string name
        string email
        text message
        boolean is_read
        datetime created_at
    }
```

---

## 6. User Interface & Page-by-Page Routing

| Route | View Handler | Template | Description |
|---|---|---|---|
| `/` | [about_view](file:///c:/Users/Lenovo/OneDrive/Music/CarLoanCalculator/CarLoan/loan_calculator/car_loan/views.py#L839) | `car_loan/about.html` | Public landing page with feature breakdown & contact form |
| `/login/` | `auth_views.LoginView` | `registration/login.html` | User sign-in with username/password & Google OAuth2 |
| `/signup/` | [signup_view](file:///c:/Users/Lenovo/OneDrive/Music/CarLoanCalculator/CarLoan/loan_calculator/car_loan/views.py#L35) | `car_loan/signup.html` | Account registration |
| `/calculator/` | [calculator_view](file:///c:/Users/Lenovo/OneDrive/Music/CarLoanCalculator/CarLoan/loan_calculator/car_loan/views.py#L56) | `car_loan/calculator.html` | Interactive loan input form with fee configurations |
| `/result/` | [result_view](file:///c:/Users/Lenovo/OneDrive/Music/CarLoanCalculator/CarLoan/loan_calculator/car_loan/views.py#L331) | `car_loan/result.html` | Detailed financial breakdown with Chart.js TCO charts |
| `/download_pdf/` | [download_pdf](file:///c:/Users/Lenovo/OneDrive/Music/CarLoanCalculator/CarLoan/loan_calculator/car_loan/views.py#L500) | `car_loan/pdf_template.html` | Streams generated A4 loan summary PDF |
| `/value-estimator/` | [value_estimator](file:///c:/Users/Lenovo/OneDrive/Music/CarLoanCalculator/CarLoan/loan_calculator/car_loan/views.py#L1050) | `car_loan/value_estimator.html` | Multimodal AI valuation screen with image drag-and-drop |
| `/compare-loans/` | [compare_loans_view](file:///c:/Users/Lenovo/OneDrive/Music/CarLoanCalculator/CarLoan/loan_calculator/car_loan/views.py#L647) | `car_loan/compare_loans.html` | Side-by-side financing comparator table |
| `/early-payoff/` | [early_payoff_view](file:///c:/Users/Lenovo/OneDrive/Music/CarLoanCalculator/CarLoan/loan_calculator/car_loan/views.py#L737) | `car_loan/early_payoff.html` | Prepayment savings simulation tool |
| `/budget-analyzer/` | [budget_analyzer_view](file:///c:/Users/Lenovo/OneDrive/Music/CarLoanCalculator/CarLoan/loan_calculator/car_loan/views.py#L794) | `car_loan/budget_analyzer.html` | Debt-to-income and affordability calculator |
| `/saved/` | [SavedCalculationsView](file:///c:/Users/Lenovo/OneDrive/Music/CarLoanCalculator/CarLoan/loan_calculator/car_loan/views.py#L59) | `car_loan/saved_calculations.html` | Saved calculation history and portfolio view |
| `/guide/` | [guide_view](file:///c:/Users/Lenovo/OneDrive/Music/CarLoanCalculator/CarLoan/loan_calculator/car_loan/views.py#L51) | `car_loan/guide.html` | Comprehensive platform user handbook |
| `/metrics` | [metrics_view](file:///c:/Users/Lenovo/OneDrive/Music/CarLoanCalculator/CarLoan/loan_calculator/car_loan/views.py#L31) | Raw Prometheus text | Prometheus metric collector endpoint |

---

## 7. DevOps & Cloud-Native Infrastructure (The 6 Pillars)

### 7.1 Docker & Multi-Stage Containerization
All microservices run in isolated containers communicating over an internal bridge network:
- [docker-compose.yml](file:///c:/Users/Lenovo/OneDrive/Music/CarLoanCalculator/CarLoan/docker-compose.yml): Coordinates `postgres_db`, `valuation_service`, `pdf_service`, and `web_app`.
- **Pre-Built Images:**
  - `carloancalculator-web_app:latest`
  - `carloancalculator-valuation_service:latest`
  - `carloancalculator-pdf_service:latest`
  - `postgres:15-alpine`

### 7.2 Kubernetes Orchestration & Horizontal Pod Autoscaling (HPA)
Manifests located in [`k8s/`](file:///c:/Users/Lenovo/OneDrive/Music/CarLoanCalculator/CarLoan/k8s):
- **Web App:** NodePort service on port `30080`, autoscales **1 to 10 pods** when CPU utilization exceeds 50%.
- **AI Valuation:** ClusterIP service on port `5001`, autoscales **1 to 5 pods** at 50% CPU.
- **PDF Service:** ClusterIP service on port `5002`, autoscales **1 to 4 pods** at 50% CPU.
- **PostgreSQL:** Deployment with persistent volume claim on port `5432`.

### 7.3 Infrastructure as Code via Terraform on AWS
Located in [`terraform/`](file:///c:/Users/Lenovo/OneDrive/Music/CarLoanCalculator/CarLoan/terraform):
- Provisions an **AWS Windows Server 2022 Base** instance (`t3.medium`, 40GB gp3 SSD).
- Provisions Security Group firewall opening RDP (`3389`), WinRM (`5985`), HTTP (`80`), Web (`8000`), AI (`5001`), and PDF (`5002`).
- Allocates and associates a static Elastic IP (EIP).
- Automated startup provisioning via PowerShell user data script [user_data.ps1](file:///c:/Users/Lenovo/OneDrive/Music/CarLoanCalculator/CarLoan/terraform/user_data.ps1).

### 7.4 Time-Series Observability with Prometheus
- Configured via [prometheus.yml](file:///c:/Users/Lenovo/OneDrive/Music/CarLoanCalculator/CarLoan/monitoring/prometheus.yml) on port `9090`.
- Scrapes metrics every 15s from `carloan_web_app`, `ai_valuation_service`, and `pdf_service`.
- Key tracked KPIs:
  - `carloan_ai_valuation_requests_total{engine, status}`
  - `carloan_ai_valuation_latency_seconds`
  - `carloan_pdf_generation_requests_total{status}`
  - `carloan_pdf_generation_latency_seconds`
  - `http_requests_total`
  - `request_duration_seconds`

### 7.5 Real-Time Operational Dashboards with Grafana
- Runs on port `3000` via [docker-compose.monitoring.yml](file:///c:/Users/Lenovo/OneDrive/Music/CarLoanCalculator/CarLoan/monitoring/docker-compose.monitoring.yml).
- Automatically provisions Prometheus data source and pre-built dashboard: [carloan_dashboard.json](file:///c:/Users/Lenovo/OneDrive/Music/CarLoanCalculator/CarLoan/monitoring/grafana/provisioning/dashboards/carloan_dashboard.json).
- Displays real-time request rates, P95 latency distribution curves, and service health status gauges.

### 7.6 Continuous Deployment via GitHub Webhooks
- Handled by [webhook_server.py](file:///c:/Users/Lenovo/OneDrive/Music/CarLoanCalculator/CarLoan/webhook_server.py) listening on port `9000`.
- Validates the `X-Hub-Signature-256` header using HMAC-SHA256 with `GITHUB_WEBHOOK_SECRET`.
- When a push event is detected on branch `Raj` or `main`:
  1. Executes `git pull origin <branch>`.
  2. Executes `docker compose up -d --build`.
  3. Achieves automated, hands-off redeployment in under 3 seconds.

### 7.7 Concurrent Traffic Generation & Stress Testing (`load_test.py`)
- Python multi-threaded traffic generator [load_test.py](file:///c:/Users/Lenovo/OneDrive/Music/CarLoanCalculator/CarLoan/load_test.py).
- Syntax:
  ```powershell
  python load_test.py --url http://localhost:8000/login/ --concurrency 40 --duration 60
  ```
- Used to observe Kubernetes HPA pod scale-out in real time.

---

## 8. Configuration & Environment Variables Directory

| Variable | Required In | Description | Example / Default |
|---|---|---|---|
| `SECRET_KEY` | Web App | Django cryptographic signing key | Long randomized string |
| `DEBUG` | Web App | Development debug flag | `False` in prod, `True` in dev |
| `ALLOWED_HOSTS` | Web App | Permitted hostnames | `carloan-web.onrender.com,localhost,127.0.0.1` |
| `CSRF_TRUSTED_ORIGINS` | Web App | Trusted origins for CSRF POST | `https://carloan-web.onrender.com` |
| `DATABASE_URL` | Web App | Full PostgreSQL URI (Render/Neon) | `postgresql://user:pass@host:5432/dbname` |
| `DB_NAME` | Web App / Postgres | Local database name | `Car_Loan` |
| `DB_USER` | Web App / Postgres | Database user | `postgres` |
| `DB_PASSWORD` | Web App / Postgres | Database password | Password string |
| `DB_HOST` | Web App | Database host | `postgres_db` (Docker) or `127.0.0.1` |
| `DB_PORT` | Web App | Database port | `5432` |
| `GOOGLE_GEMINI_API_KEY` | Web / AI Service | Google Gemini API Key | `AIzaSy...` |
| `VALUATION_SERVICE_URL` | Web App | URL to FastAPI AI valuation service | `http://valuation_service:5001/api/estimate` |
| `PDF_SERVICE_URL` | Web App | URL to FastAPI PDF generator service | `http://pdf_service:5002/api/generate-pdf` |
| `SOCIAL_AUTH_GOOGLE_OAUTH2_KEY` | Web App | Google OAuth2 Client ID | `*.apps.googleusercontent.com` |
| `SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET`| Web App | Google OAuth2 Client Secret | Secret string |
| `GITHUB_WEBHOOK_SECRET` | Webhook Server | Secret key matching GitHub Webhook settings | `my_secure_secret_123` |

---

## 9. Deployment & Operations Runbook

### Option 1: Docker Compose (Recommended Local Stack)
```powershell
cd CarLoan
docker compose up -d --build
docker compose exec web_app python manage.py migrate
docker compose ps
```
Access points:
- Web App: `http://localhost:8000`
- AI Valuation: `http://localhost:5001/health`
- PDF Service: `http://localhost:5002/health`

### Option 2: Kubernetes Deployment (Minikube / Docker Desktop)
```powershell
cd CarLoan
kubectl apply -f k8s/
kubectl get pods
kubectl get services
kubectl get hpa --watch
```

### Option 3: Observability Stack (Prometheus + Grafana)
```powershell
cd CarLoan/monitoring
docker compose -f docker-compose.monitoring.yml up -d
```
Access points:
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3000` (User/Password: `admin` / `admin`)

### Option 4: Cloud Infrastructure Deployment (Terraform AWS)
```powershell
cd CarLoan/terraform
terraform init
terraform plan
terraform apply -auto-approve
```

---

## 10. Security Posture, Error Handling & Production Hardening

1. **Authentication Isolation**: User data (saved portfolios, custom comparisons, early payoff simulations) is strictly scoped by `user=request.user` on all queries.
2. **CSRF & Proxy Headers**:
   - `SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')` ensures secure cookie handling behind reverse proxies like Render or Nginx.
   - Django `@csrf_protect` applied on state-altering views.
3. **Cryptographic Webhook Verification**: `webhook_server.py` evaluates incoming push notifications using constant-time comparison (`hmac.compare_digest`) against SHA256 hashes to prevent timing attacks.
4. **Input Sanitization**: Numeric inputs across financial views pass through [validate_numeric_input](file:///c:/Users/Lenovo/OneDrive/Music/CarLoanCalculator/CarLoan/loan_calculator/car_loan/views.py#L127) with strict upper/lower clamping to prevent decimal division by zero or buffer overflows.

---

## 11. Troubleshooting & Frequently Asked Questions (FAQ)

### Q1: The PDF download fails with "Local PDF generation failed".
**Cause**: The standalone PDF microservice is offline and local WeasyPrint system dependencies (Pango, Cairo, HarfBuzz) are not installed on the host OS.  
**Fix**: Start the PDF microservice via Docker (`docker compose up -d pdf_service`) or verify `PDF_SERVICE_URL` points to an active instance.

### Q2: AI Vehicle Valuation returns fallback text instead of Gemini AI response.
**Cause**: Missing or invalid `GOOGLE_GEMINI_API_KEY`, or quota limits on the Gemini 2.0 Flash endpoint.  
**Fix**: Check [CarLoan/.env](file:///c:/Users/Lenovo/OneDrive/Music/CarLoanCalculator/CarLoan/.env) and verify the API key is active. The system automatically maintains continuity by falling back to the 5-tier algorithmic depreciation engine.

### Q3: Google OAuth2 login fails with redirect URI mismatch.
**Cause**: The redirect URL configured in Google Cloud Console does not match the active host.  
**Fix**: Update `SOCIAL_AUTH_GOOGLE_OAUTH2_REDIRECT_URI` in `.env` to match your domain (e.g. `https://carloan-web.onrender.com/social-auth/complete/google-oauth2/` for production, or `http://127.0.0.1:8000/social-auth/complete/google-oauth2/` for local testing).

---

*End of Technical Documentation — Car Loan Calculator and Value Estimator*
