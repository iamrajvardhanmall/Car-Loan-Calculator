"""
AI Vehicle Valuation Microservice
Powered by Google Gemini 2.0 Flash & Rule-Based Depreciation Engine
"""
import os
import json
import logging
from datetime import datetime
from decimal import Decimal, InvalidOperation
from urllib import error as urllib_error
from urllib import request as urllib_request
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai_valuation_service")

app = FastAPI(
    title="AI Vehicle Valuation Microservice",
    description="Independent microservice for vehicle valuation with Gemini 2.0 Flash and algorithmic appraisal.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GOOGLE_GEMINI_API_KEY = os.getenv("GOOGLE_GEMINI_API_KEY", "")
GOOGLE_GEMINI_API_URL = os.getenv(
    "GOOGLE_GEMINI_API_URL",
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
)


class ValuationRequest(BaseModel):
    mode: Optional[str] = "manual"  # "manual" or "image"
    make: Optional[str] = "Unknown"
    model: Optional[str] = "Unknown"
    year: Optional[int] = None
    mileage_km: Optional[float] = 0
    mileage: Optional[float] = 0
    condition: Optional[str] = "good"
    city: Optional[str] = "Unknown"
    features: Optional[List[str]] = []
    images: Optional[List[str]] = []  # base64 encoded strings


class ValuationResponse(BaseModel):
    success: bool
    text: str
    confidence: int
    estimated_value: int
    condition: str
    engine_used: str  # "gemini_2.0_flash" or "algorithmic_fallback"


def estimate_market_value(make: str, model: str, year: Optional[int], mileage_km: float, condition: str, features: List[str], city: str) -> int:
    current_year = datetime.now().year
    make_key = (make or 'Unknown').strip() or 'Unknown'
    model_key = (model or 'Unknown').strip() or 'Unknown'
    key = f"{make_key}|{model_key}"

    bases = {
        'BMW|X5': 4500000,
        'BMW|3 Series': 2000000,
        'Toyota|Camry': 1500000,
        'Honda|Civic': 1200000,
        'Ford|F-150': 3000000,
        'Unknown|Unknown': 1500000,
    }
    base_price = bases.get(key, bases.get(make_key, bases['Unknown|Unknown']))

    vehicle_year = int(year) if year else current_year
    age = max(0, current_year - vehicle_year)
    depreciation_factor = Decimal('0.88') ** age

    mileage_value = Decimal(str(mileage_km or 0))
    mileage_factor = Decimal('1') - min(mileage_value / Decimal('250000'), Decimal('0.6'))

    condition_multipliers = {
        'excellent': Decimal('1.12'),
        'good': Decimal('1.00'),
        'fair': Decimal('0.90'),
        'poor': Decimal('0.75'),
    }
    condition_multiplier = condition_multipliers.get((condition or '').lower(), Decimal('1.00'))

    features_bonus = Decimal('1') + min(Decimal(len(features or [])) * Decimal('0.02'), Decimal('0.12'))

    city_multipliers = {
        'Mumbai': Decimal('1.12'),
        'Delhi': Decimal('1.10'),
        'Bengaluru': Decimal('1.08'),
        'Chennai': Decimal('1.05'),
        'Kolkata': Decimal('1.02'),
        'Pune': Decimal('1.03'),
        'Hyderabad': Decimal('1.04'),
        'Other': Decimal('0.95'),
        'Unknown': Decimal('1.00'),
    }
    city_multiplier = city_multipliers.get(city or 'Unknown', Decimal('1.00'))

    estimated_value = (
        Decimal(str(base_price))
        * depreciation_factor
        * mileage_factor
        * condition_multiplier
        * features_bonus
        * city_multiplier
    )
    return int(max(estimated_value, Decimal('20000')).quantize(Decimal('1')))


def build_estimator_text(estimated_value: int, make: str, model: str, year: int, mileage_km: float, condition: str, city: str, features: List[str], image_count: int = 0) -> str:
    feature_text = ', '.join(features) if features else 'standard equipment'
    source_note = f'Based on {image_count} uploaded image(s), ' if image_count else 'Based on the provided details, '
    return (
        f'Estimated Value: ₹{estimated_value:,.0f}\n\n'
        f'1. Condition Assessment: The {condition} condition {make} {model} shows typical wear for a {year} model with {mileage_km} km.\n\n'
        f'2. Features Analysis: Selected features ({feature_text}) add value to the vehicle.\n\n'
        f'3. Value Impact Factors: Year, mileage, condition, and {city} market trends are the main pricing factors.\n\n'
        f'4. Market Analysis: {source_note}this estimate reflects similar vehicles in the current market.'
    )


def call_gemini_estimator(req: ValuationRequest) -> Optional[str]:
    api_key = GOOGLE_GEMINI_API_KEY
    api_url = GOOGLE_GEMINI_API_URL
    if not api_key:
        return None

    make = req.make or 'Unknown'
    model = req.model or 'Unknown'
    year = req.year or datetime.now().year
    mileage_km = req.mileage_km or req.mileage or 0
    condition = req.condition or 'good'
    city = req.city or 'Unknown'
    features = req.features or []
    images = req.images or []
    mode = req.mode or 'manual'

    prompt = (
        'You are a professional car appraiser. Please estimate the value of this vehicle:\n'
        f'Make: {make}\n'
        f'Model: {model}\n'
        f'Year: {year}\n'
        f'Mileage: {mileage_km} km\n'
        f'City: {city}\n'
        f'Condition: {condition}\n'
        f'Features: {", ".join(features) if features else "standard equipment"}\n\n'
        'Provide a detailed response that includes:\n'
        '1. Estimated Value in INR (formatted as "Estimated Value: ₹X,XXX")\n'
        '2. Condition Assessment\n'
        '3. Features Analysis\n'
        '4. Value Impact Factors\n'
        '5. Market Analysis\n\n'
        'Format your response clearly with each section on a new line.'
    )
    parts = [{"text": prompt}]
    if mode == 'image':
        for image_data in images:
            parts.append({
                'inline_data': {
                    'mime_type': 'image/jpeg',
                    'data': image_data,
                }
            })

    request_body = {
        'contents': [{'parts': parts}],
        'generationConfig': {
            'temperature': 0.7,
            'topK': 40,
            'topP': 0.95,
            'maxOutputTokens': 1024,
        },
    }

    req_obj = urllib_request.Request(
        f'{api_url}?key={api_key}',
        data=json.dumps(request_body).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST',
    )

    try:
        with urllib_request.urlopen(req_obj, timeout=30) as response:
            response_data = json.loads(response.read().decode('utf-8'))
        return response_data['candidates'][0]['content']['parts'][0]['text']
    except Exception as exc:
        logger.warning('Gemini estimator request failed: %s', exc)
        return None


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "ai_valuation_service"}


@app.post("/api/estimate", response_model=ValuationResponse)
def estimate_vehicle(req: ValuationRequest):
    try:
        mode = req.mode or 'manual'
        make = (req.make or 'Unknown').strip() or 'Unknown'
        model = (req.model or 'Unknown').strip() or 'Unknown'
        year = req.year or datetime.now().year
        mileage_km = req.mileage_km or req.mileage or 0
        city = req.city or 'Unknown'
        features = req.features or []
        images = req.images or []

        if mode == 'image' and not req.condition:
            condition = 'good' if len(images) > 1 else 'fair'
        else:
            condition = req.condition or 'good'

        estimated_value = estimate_market_value(make, model, year, mileage_km, condition, features, city)
        
        if mode == 'image':
            confidence = min(95, 70 + (len(images) * 5) + (10 if req.year else 0) + (10 if mileage_km else 0))
        else:
            confidence = min(95, 72 + (10 if req.year else 0) + (8 if mileage_km else 0) + (5 if city else 0))

        ai_text = call_gemini_estimator(req)
        engine_used = "gemini_2.0_flash" if ai_text else "algorithmic_fallback"

        if not ai_text:
            ai_text = build_estimator_text(
                estimated_value=estimated_value,
                make=make,
                model=model,
                year=year,
                mileage_km=mileage_km,
                condition=condition,
                city=city,
                features=features,
                image_count=len(images) if mode == 'image' else 0,
            )

        return ValuationResponse(
            success=True,
            text=ai_text,
            confidence=confidence,
            estimated_value=estimated_value,
            condition=condition,
            engine_used=engine_used,
        )
    except Exception as exc:
        logger.error("Valuation failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))
