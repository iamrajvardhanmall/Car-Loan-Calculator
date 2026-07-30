# Car Loan Calculator 🚗💰

A comprehensive Django web application for calculating car loan payments with AI-powered vehicle valuation and advanced financial planning features.

## 🌟 Features

- **Loan Calculator**: Calculate monthly payments with credit score impact
- **AI Car Valuation**: Google Gemini AI-powered vehicle value estimation  
- **Loan Comparison**: Compare multiple loan options side-by-side
- **Budget Analyzer**: Analyze financial capacity for car loans
- **Early Payoff Calculator**: Calculate savings from extra payments
- **PDF Reports**: Generate professional loan summaries
- **User Authentication**: Django auth + Google OAuth2 integration

## 🛠️ Technology Stack

- **Backend**: Django 4.2, SQLite/PostgreSQL
- **Frontend**: Bootstrap 5, Vanilla JavaScript ES6+
- **AI Integration**: Google Gemini API
- **Authentication**: Django Auth + Google OAuth2
- **PDF Generation**: WeasyPrint
- **Styling**: Bootstrap 5, Google Fonts

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Git
- Google Cloud Console account (for API keys)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/car-loan-calculator.git
   cd car-loan-calculator/CarLoan/loan_calculator
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   SECRET_KEY=your-generated-secret-key-here
   DEBUG=True
   GOOGLE_GEMINI_API_KEY=your-google-gemini-api-key
   SOCIAL_AUTH_GOOGLE_OAUTH2_KEY=your-google-oauth-client-id
   SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET=your-google-oauth-client-secret
   ```

5. **Database Setup**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   python manage.py createsuperuser
   ```

6. **Run Development Server**
   ```bash
   python manage.py runserver
   ```

   Visit `http://localhost:8000` to access the application.

## 🔑 API Keys Setup

### Google Gemini AI API
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add to your `.env` file: `GOOGLE_GEMINI_API_KEY=your-api-key`

### Google OAuth2 (Optional)
1. Go to [Google Cloud Console](https://console.developers.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth2 credentials
5. Add authorized redirect URIs: `http://localhost:8000/auth/complete/google-oauth2/`
6. Add credentials to `.env` file

## 📊 Features Overview

### Loan Calculator
- Vehicle price, down payment, trade-in value
- Loan term (12-84 months) and interest rate
- Credit score impact (300-850)
- Additional costs: insurance, maintenance, fuel

### AI Car Valuation
- Manual vehicle details input
- Image upload for visual assessment
- Market value estimation with AI
- Condition-based adjustments

### Advanced Tools
- **Loan Comparison**: Side-by-side analysis
- **Budget Analyzer**: DTI ratio and affordability
- **Early Payoff**: Extra payment benefits
- **PDF Reports**: Professional summaries

## 🗄️ Database Models

- **LoanCalculation**: Basic loan parameters
- **SavedCalculation**: Comprehensive user calculations
- **LoanComparison**: Multiple loan scenarios
- **EarlyPayoff**: Extra payment analysis
- **MonthlyBudget**: Financial capacity assessment

## 🔒 Security Features

- CSRF protection on all forms
- Input validation and sanitization
- SQL injection prevention via ORM
- XSS protection through template escaping
- Secure API key management
- User data isolation

## 📱 Responsive Design

- Mobile-first Bootstrap 5 design
- Interactive sliders and forms
- Real-time calculations
- Progressive enhancement
- Cross-browser compatibility

## 🚀 Production Deployment

1. **Environment Variables**
   ```env
   DEBUG=False
   SECRET_KEY=your-production-secret-key
   ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
   DATABASE_URL=postgresql://user:pass@localhost/dbname
   ```

2. **Database Migration**
   ```bash
   python manage.py collectstatic
   python manage.py migrate
   ```

3. **Static Files**
   Configure static file serving (AWS S3, Nginx, etc.)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add some feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Django community for the excellent framework
- Google for Gemini AI API
- Bootstrap team for the CSS framework
- WeasyPrint for PDF generation

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/car-loan-calculator/issues) page
2. Create a new issue with detailed description
3. Include error messages and steps to reproduce

---

**Note**: This application uses external APIs. Ensure you have valid API keys and respect the terms of service for all integrated services.
