<div align="center">

# 🚗 AI Car Loan Calculator

### Financial planning, vehicle valuation, PDF reporting, and cloud-native operations in one platform

<p>
  <a href="https://carloan-web.onrender.com/"><strong>🌐 Open the live application</strong></a>
</p>

<p>
  <img src="https://img.shields.io/badge/Python-3.11%2B-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python 3.11 or newer" />
  <img src="https://img.shields.io/badge/Django-4.2-092E20?style=for-the-badge&logo=django&logoColor=white" alt="Django 4.2" />
  <img src="https://img.shields.io/badge/FastAPI-Microservices-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Google_Gemini-Optional_AI-8E75B2?style=for-the-badge&logo=google&logoColor=white" alt="Google Gemini" />
  <img src="https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker Compose" />
  <img src="https://img.shields.io/badge/Kubernetes-Ready-326CE5?style=for-the-badge&logo=kubernetes&logoColor=white" alt="Kubernetes" />
  <img src="https://img.shields.io/badge/Prometheus%20%2B%20Grafana-Observability-F46800?style=for-the-badge&logo=prometheus&logoColor=white" alt="Prometheus and Grafana" />
</p>

</div>

## Live application

**Production URL:** [https://carloan-web.onrender.com/](https://carloan-web.onrender.com/)

The root URL opens the authentication flow. Create an account or sign in to use the calculator and account-specific features. The deployed application is configured as a Django web service backed by PostgreSQL on Render.

Useful production routes:

| Route | Purpose |
|---|---|
| `/login/` | Sign in |
| `/signup/` | Create an account |
| `/calculator/` | Calculate a loan and total ownership cost |
| `/value-estimator/` | Estimate a vehicle's market value |
| `/saved/` | View saved calculations |
| `/compare-loans/` | Compare financing scenarios |
| `/early-payoff/` | Simulate additional payments |
| `/budget-analyzer/` | Analyze income, debt, and affordability |
| `/about/` | About page and contact form |
| `/metrics` | Prometheus metrics |

## What the platform does

AI Car Loan Calculator combines financial modeling with optional vehicle appraisal and operational tooling:

- Calculates monthly EMI, total payment, total interest, loan-to-value ratio, and affordability.
- Adjusts the effective interest rate using credit-score tiers.
- Estimates total cost of ownership using insurance, maintenance, fuel, and warranty costs.
- Simulates monthly, quarterly, yearly, and one-time extra payments.
- Compares multiple loan scenarios and stores user-owned comparisons.
- Estimates vehicle value from make, model, year, mileage, condition, city, features, and optional images.
- Uses Google Gemini when configured, with a deterministic algorithmic valuation fallback.
- Generates downloadable loan-summary PDFs through a PDF microservice or local WeasyPrint fallback.
- Stores user data and calculations in PostgreSQL.
- Exposes Prometheus metrics for the Django application and FastAPI services.

> **Important:** Valuation results are estimates for planning purposes only. They are not an offer, appraisal certificate, or guarantee of a lender's approval, interest rate, or resale price.

## Architecture

```mermaid
graph TD
    Browser[Web browser] --> Django[Django web app :8000]
    Django --> Database[(PostgreSQL :5432)]
    Django -. optional .-> Valuation[FastAPI valuation service :5001]
    Django -. optional .-> PDF[FastAPI PDF service :5002]
    Valuation --> Gemini[Google Gemini API]
    Prometheus[Prometheus :9090] --> Django
    Prometheus --> Valuation
    Prometheus --> PDF
    Grafana[Grafana :3000] --> Prometheus
    GitHub[GitHub push] --> Webhook[Webhook server :9000]
    Webhook --> Docker[Docker Compose deployment]
```

The application supports two operating modes:

1. **All-in-one Django mode** — suitable for a simple Render deployment. Django performs local valuation and PDF rendering when the microservice URLs are empty.
2. **Microservices mode** — Django delegates valuation and PDF generation to the FastAPI services when `VALUATION_SERVICE_URL` and `PDF_SERVICE_URL` are configured. Django falls back locally if those services are unavailable.

## Repository layout

```text
CarLoan/
├── loan_calculator/
│   ├── manage.py
│   ├── loan_calculator/                 # Django project settings and URLs
│   └── car_loan/                        # Application, models, views, templates, static files
├── services/
│   ├── ai_valuation_service/            # FastAPI + Gemini/fallback valuation service
│   └── pdf_service/                     # FastAPI + WeasyPrint PDF service
├── monitoring/
│   ├── prometheus.yml
│   ├── docker-compose.monitoring.yml
│   └── grafana/provisioning/
├── k8s/                                 # Kubernetes Deployments, Services, and HPAs
├── terraform/                           # AWS Windows EC2 infrastructure
├── docker-compose.yml                   # Local four-service stack
├── webhook_server.py                    # HMAC-verified GitHub deployment webhook
├── load_test.py                         # Concurrent traffic generator
└── README.md
```

## Main Django application

The Django application is in [`loan_calculator/`](./loan_calculator/).

| Area | Implementation |
|---|---|
| Settings | [`loan_calculator/settings.py`](./loan_calculator/loan_calculator/settings.py) |
| Root URL configuration | [`loan_calculator/urls.py`](./loan_calculator/loan_calculator/urls.py) |
| Application routes | [`car_loan/urls.py`](./loan_calculator/car_loan/urls.py) |
| Business logic and views | [`car_loan/views.py`](./loan_calculator/car_loan/views.py) |
| Database models | [`car_loan/models.py`](./loan_calculator/car_loan/models.py) |
| Forms | [`car_loan/forms.py`](./loan_calculator/car_loan/forms.py) |
| Admin | [`car_loan/admin.py`](./loan_calculator/car_loan/admin.py) |
| Templates | [`car_loan/templates/`](./loan_calculator/car_loan/templates/) |
| Frontend assets | [`car_loan/static/`](./loan_calculator/car_loan/static/) |

### Financial calculations

The calculator applies the standard fixed-rate amortization formula:

```text
monthly rate = annual rate / 12
EMI = principal × monthly rate × (1 + monthly rate)^term
      ---------------------------------------------------
             (1 + monthly rate)^term - 1
```

The effective annual rate is derived from the entered base rate plus the credit-score adjustment:

| Credit score | Adjustment |
|---:|---:|
| 780 and above | -0.50% |
| 740–779 | -0.25% |
| 700–739 | 0.00% |
| 660–699 | +0.50% |
| 620–659 | +1.00% |
| Below 620 | +2.00% |

The application also persists:

- `LoanCalculation`
- `SavedCalculation`
- `LoanComparison`
- `EarlyPayoff`
- `MonthlyBudget`
- `ContactQuery`

Migrations are stored in [`loan_calculator/car_loan/migrations/`](./loan_calculator/car_loan/migrations/).

## Vehicle valuation

The valuation endpoint is exposed by both the Django gateway and the optional FastAPI service.

### Valuation request inputs

- Make and model
- Manufacturing year
- Odometer mileage
- Vehicle condition
- City or regional market
- Features
- Optional base64-encoded vehicle images

### Valuation strategy

1. Calculate a baseline with the algorithmic depreciation engine.
2. Call Gemini 2.0 Flash when `GOOGLE_GEMINI_API_KEY` is configured.
3. Use the algorithmic result and generated explanation if Gemini is unavailable.

The standalone service is implemented in [`services/ai_valuation_service/main.py`](./services/ai_valuation_service/main.py).

Endpoints:

```text
GET  /health
POST /api/estimate
GET  /metrics
```

## PDF generation

Loan summaries can be generated by:

- The FastAPI PDF service in [`services/pdf_service/main.py`](./services/pdf_service/main.py), or
- Django's local WeasyPrint renderer using [`pdf_template.html`](./loan_calculator/car_loan/templates/car_loan/pdf_template.html).

The service exposes:

```text
GET  /health
POST /api/generate-pdf
GET  /metrics
```

## Run locally

### Prerequisites

- Python 3.11 or newer
- PostgreSQL 15, or Docker Desktop
- Git
- Optional: Google Gemini API key
- Optional for the full stack: Docker Compose

### Django-only development

From the repository root:

```powershell
cd loan_calculator
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 8000
```

Open [http://127.0.0.1:8000/](http://127.0.0.1:8000/).

For Django-only mode, leave `VALUATION_SERVICE_URL` and `PDF_SERVICE_URL` empty. The application will use its local valuation and PDF implementations.

### Run the complete Docker stack

From the repository root:

```powershell
docker compose up -d --build
docker compose exec web_app python manage.py migrate
```

Services:

| Service | URL |
|---|---|
| Django web app | [http://localhost:8000](http://localhost:8000) |
| AI valuation | [http://localhost:5001/health](http://localhost:5001/health) |
| PDF service | [http://localhost:5002/health](http://localhost:5002/health) |
| PostgreSQL | `localhost:5432` |

Check status:

```powershell
docker compose ps
docker compose logs -f web_app
```

Stop the stack:

```powershell
docker compose down
```

## Environment configuration

Use [`.env.example`](./.env.example) as the starting point. Never commit real credentials.

### Django and database

```dotenv
SECRET_KEY=replace-with-a-long-random-value
DEBUG=False
ALLOWED_HOSTS=carloan-web.onrender.com,localhost,127.0.0.1
CSRF_TRUSTED_ORIGINS=https://carloan-web.onrender.com
DATABASE_URL=postgresql://user:password@host:5432/database
```

For local Docker PostgreSQL, configure `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, and `DB_PORT` instead of `DATABASE_URL`.

### AI and service routing

```dotenv
GOOGLE_GEMINI_API_KEY=your-key
GOOGLE_GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent
VALUATION_SERVICE_URL=http://valuation_service:5001/api/estimate
PDF_SERVICE_URL=http://pdf_service:5002/api/generate-pdf
```

Leave the service URLs empty to use Django's local fallbacks.

### Optional Google OAuth2

```dotenv
SOCIAL_AUTH_GOOGLE_OAUTH2_KEY=your-client-id
SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET=your-client-secret
SOCIAL_AUTH_GOOGLE_OAUTH2_REDIRECT_URI=https://carloan-web.onrender.com/social-auth/complete/google-oauth2/
```

## Deploy to Render

The current live deployment is available at [carloan-web.onrender.com](https://carloan-web.onrender.com/).

Recommended Render configuration for the Django service:

| Setting | Value |
|---|---|
| Root directory | `loan_calculator` |
| Runtime | Python 3 |
| Build command | `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate` |
| Start command | `gunicorn loan_calculator.wsgi:application` |
| Database | PostgreSQL through `DATABASE_URL` |
| `DEBUG` | `False` |

Recommended production variables:

```dotenv
DEBUG=False
SECRET_KEY=<strong-random-secret>
DATABASE_URL=<Render internal PostgreSQL URL>
ALLOWED_HOSTS=carloan-web.onrender.com
CSRF_TRUSTED_ORIGINS=https://carloan-web.onrender.com
```

The application can run on Render as a single web service. To demonstrate the complete microservices topology, deploy the AI and PDF services separately and set their public HTTPS URLs in `VALUATION_SERVICE_URL` and `PDF_SERVICE_URL`.

The detailed deployment procedure is in [`RENDER_DEPLOYMENT_GUIDE.md`](./RENDER_DEPLOYMENT_GUIDE.md).

## Monitoring and observability

The monitoring stack is in [`monitoring/`](./monitoring).

Start Prometheus and Grafana:

```powershell
cd monitoring
docker compose -f docker-compose.monitoring.yml up -d
```

Open:

- Prometheus: [http://localhost:9090](http://localhost:9090)
- Prometheus targets: [http://localhost:9090/targets](http://localhost:9090/targets)
- Grafana: [http://localhost:3000](http://localhost:3000)

The Grafana provisioning files are under [`monitoring/grafana/provisioning/`](./monitoring/grafana/provisioning/). The dashboard is [`carloan_dashboard.json`](./monitoring/grafana/provisioning/dashboards/carloan_dashboard.json).

The tagged Render monitoring guide is [`monitoring/RENDER_MONITORING_GUIDE.md`](./monitoring/RENDER_MONITORING_GUIDE.md).

Important metrics include:

```text
up{job="carloan_web_app"}
http_requests_total
request_duration_seconds
carloan_ai_valuation_requests_total
carloan_ai_valuation_latency_seconds
carloan_pdf_generation_requests_total
carloan_pdf_generation_latency_seconds
process_resident_memory_bytes
process_cpu_seconds_total
```

## Kubernetes

Kubernetes manifests are in [`k8s/`](./k8s):

- [`web-app.yaml`](./k8s/web-app.yaml) — Django Deployment, NodePort Service, and HPA
- [`ai-valuation.yaml`](./k8s/ai-valuation.yaml) — valuation Deployment, Service, and HPA
- [`pdf-service.yaml`](./k8s/pdf-service.yaml) — PDF Deployment, Service, and HPA
- [`postgres.yaml`](./k8s/postgres.yaml) — PostgreSQL Deployment and Service

Apply the manifests:

```powershell
kubectl apply -f k8s/
kubectl get pods
kubectl get services
kubectl get hpa
```

The configured HPA ranges are:

| Workload | Minimum | Maximum | CPU target |
|---|---:|---:|---:|
| Django web app | 1 | 10 | 50% |
| AI valuation | 1 | 5 | 50% |
| PDF service | 1 | 4 | 50% |

See [`KUBERNETES_DEPLOYMENT_GUIDE.md`](./KUBERNETES_DEPLOYMENT_GUIDE.md) for Minikube and Docker Desktop instructions.

## Terraform on AWS

The [`terraform/`](./terraform/) configuration provisions a Windows Server 2022 EC2 host with:

- A security group
- A `t3.medium` instance by default
- A 40 GB gp3 root volume
- An Elastic IP
- Bootstrap automation through [`user_data.ps1`](./terraform/user_data.ps1)

The default security group is intentionally broad for demonstration and should be restricted to trusted CIDR ranges before production use, especially RDP (`3389`) and WinRM (`5985`).

```powershell
cd terraform
terraform init
terraform plan
terraform apply
```

More details are in [`terraform/TERRAFORM_README.md`](./terraform/TERRAFORM_README.md).

## Webhook deployment server

[`webhook_server.py`](./webhook_server.py) provides a FastAPI GitHub push-webhook receiver on port `9000`.

It:

1. Validates `X-Hub-Signature-256` with HMAC-SHA256.
2. Accepts pushes to the configured `Raj` or `main` branches.
3. Runs `git pull`.
4. Rebuilds and restarts the Docker Compose stack.

Run it with:

```powershell
$env:GITHUB_WEBHOOK_SECRET = "replace-with-a-long-random-secret"
python webhook_server.py
```

Do not expose the webhook server publicly without a strong secret, network controls, and a deployment environment dedicated to this purpose.

## Load testing

[`load_test.py`](./load_test.py) generates concurrent requests for local or Kubernetes testing:

```powershell
python load_test.py --url http://localhost:8000/login/ --concurrency 30 --duration 90
```

Use it with `kubectl get hpa -w` to observe autoscaling behavior. Do not run load tests against the public production URL without authorization and a controlled test window.

## Security and production notes

- Keep `.env` files, API keys, OAuth secrets, database passwords, and webhook secrets out of version control.
- Use `DEBUG=False` in production.
- Set `ALLOWED_HOSTS` and `CSRF_TRUSTED_ORIGINS` to exact production values.
- Use HTTPS for all public services and OAuth redirect URLs.
- Restrict Terraform security-group ingress instead of allowing `0.0.0.0/0`.
- Use a production WSGI server such as Gunicorn rather than Django `runserver`.
- Run migrations during deployment before serving traffic.
- Configure persistent database storage and backups for production data.
- Treat AI-generated valuations as estimates and validate them independently.

## Validation

Run Django's built-in checks from the Django project directory:

```powershell
cd loan_calculator
python manage.py check
```

The current project passes Django system checks.

## Documentation

- [Project overview](./PROJECT_OVERVIEW.md)
- [Render deployment guide](./RENDER_DEPLOYMENT_GUIDE.md)
- [Kubernetes deployment guide](./KUBERNETES_DEPLOYMENT_GUIDE.md)
- [DevOps and microservices guide](./DEVOPS_MICROSERVICES_GUIDE.md)
- [DevOps audit report](./DEVOPS_AUDIT_REPORT.md)
- [Render monitoring guide](./monitoring/RENDER_MONITORING_GUIDE.md)
- [Terraform guide](./terraform/TERRAFORM_README.md)

## License

This project is released under the MIT License. Add or reference the repository's license file here if one is included in the distribution.
