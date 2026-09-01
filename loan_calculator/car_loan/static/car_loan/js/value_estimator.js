// AI Car Value Estimator JavaScript functionality

// Add this helper function at the start of your script
function cleanAIResponse(text) {
    // First extract the estimated value (support formats like ₹12,345 or $12,345.67)
    const valueMatch = text.match(/[₹$]\s?[\d,]+(?:\.\d{1,2})?/);

    // Prepare a formatted display value if we found one
    if (valueMatch) {
        const raw = valueMatch[0];
        // Normalize symbol to ₹ and remove symbol/commas for numeric conversion
        const numeric = raw.replace(/[₹$\s,]/g, '');
        const num = parseFloat(numeric) || 0;
        const formatted = num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        const display = `₹${formatted}`;
        const el = document.getElementById('estimatedValue');
        if (el) {
            el.innerHTML = `\n                <div class="value-display">\n                    ${display}\n                </div>\n            `;
        }
    }
    
    // Process the remaining text
    const sections = text
        .replace(/[₹$]\s?[\d,]+(?:\.\d{1,2})?/g, '') // Remove all currency amounts
        .replace(/Estimated Value:?\s*/gi, '') // Remove "Estimated Value:" text
        .replace(/Assessment Details:?\s*/gi, '') // Remove "Assessment Details:" text
        .split(/\d+\.\s+/)
        .filter(Boolean)
        .map(section => section.trim())
        .filter(section => section.length > 0);

    // Create the details HTML
    return `
        <div class="assessment-details">
            ${sections.map(section => `
                <div class="detail-item">
                    <i class="bi bi-check2-circle text-info"></i>
                    <span>${section
                        .replace(/\*+/g, '')
                        .replace(/\s+/g, ' ')
                        .trim()
                    }</span>
                </div>
            `).join('')}
            <div class="disclaimer mt-3">
                <small class="text-muted">
                    * This is an AI-generated estimate based on provided information. 
                    Actual market value may vary.
                </small>
            </div>
        </div>
    `;
}

// Simple heuristic market value estimator used for test/mock mode
function estimateMarketValue(make, model, year, mileage, condition, features, city) {
    const key = `${make || 'Unknown'}|${model || 'Unknown'}`;
    const bases = {
        'BMW|X5': 4500000,
        'BMW|3 Series': 2000000,
        'Toyota|Camry': 1500000,
        'Honda|Civic': 1200000,
        'Ford|F-150': 3000000,
        'Unknown|Unknown': 1500000
    };

    let base = bases[key] || (bases[make] || bases['Unknown|Unknown'] || 1000000);

    const currentYear = new Date().getFullYear();
    const age = Math.max(0, currentYear - (parseInt(year) || currentYear));

    // Annual depreciation ~12% compounded
    const depreciationFactor = Math.pow(0.88, age);

    // Mileage factor: more mileage reduces value, cap the reduction
    const mileageNumeric = parseFloat(mileage) || 0;
    const mileageFactor = 1 - Math.min(mileageNumeric / 250000, 0.6);

    const conditionMultipliers = {
        'excellent': 1.12,
        'good': 1.00,
        'fair': 0.90,
        'poor': 0.75
    };
    const conditionMultiplier = conditionMultipliers[(condition || '').toLowerCase()] || 1.0;

    const featuresBonus = 1 + Math.min((features && features.length ? features.length * 0.02 : 0), 0.12);

    let price = base * depreciationFactor * mileageFactor * conditionMultiplier * featuresBonus;
    // City multiplier to reflect regional price differences
    const cityMultipliers = {
        'Mumbai': 1.12,
        'Delhi': 1.10,
        'Bengaluru': 1.08,
        'Chennai': 1.05,
        'Kolkata': 1.02,
        'Pune': 1.03,
        'Hyderabad': 1.04,
        'Other': 0.95,
        'Unknown': 1.0
    };
    const cityKey = (city || 'Unknown');
    const cityMultiplier = cityMultipliers[cityKey] || 1.0;
    price = price * cityMultiplier;
    // Ensure a sensible floor
    price = Math.max(price, 20000);
    return Math.round(price);
}

// API Configuration
const API_KEY = window.GOOGLE_GEMINI_API_KEY || "";
const API_URL = window.GOOGLE_GEMINI_API_URL || "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// Helper function to try API request with fallback keys
async function tryAPIRequest(url, requestBody) {
    const keys = [API_KEY].filter(key => key && key !== 'your-api-key-here' && key.length > 20);
    
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        console.log(`Trying API key ${i + 1} of ${keys.length}: ${key.substring(0, 10)}...`);
        
        try {
            const response = await fetch(`${url}?key=${key}`, requestBody);
            
            if (response.ok) {
                console.log(`API key ${i + 1} successful`);
                return response;
            } else {
                const errorText = await response.text();
                console.log(`API key ${i + 1} failed with status: ${response.status}`, errorText);
                if (i === keys.length - 1) {
                    // This is the last key, throw the error
                    throw new Error(`API request failed: ${response.status} - ${errorText}`);
                }
                // Continue to next key
            }
        } catch (error) {
            console.log(`API key ${i + 1} error:`, error.message);
            if (i === keys.length - 1) {
                throw error; // This is the last key, throw the error
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('estimatorForm');
    const imageForm = document.getElementById('imageEstimatorForm');
    const resultDiv = document.getElementById('estimateResult');
    const loadingSpinner = document.querySelector('.loading-spinner');
    const errorMessage = document.getElementById('errorMessage');
    const imageErrorMessage = document.getElementById('imageErrorMessage');
    const dropZone = document.getElementById('dropZone');
    const carImageInput = document.getElementById('carImage');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const guideToggle = document.getElementById('guideToggle');
    const guideContent = document.getElementById('guideContent');

    // Array to store uploaded images
    let uploadedImages = [];

    // Toggle user guide visibility
    if (guideToggle && guideContent) {
        guideToggle.addEventListener('click', function() {
            guideContent.style.display = guideContent.style.display === 'none' ? 'block' : 'none';
            this.classList.toggle('collapsed');
            this.innerHTML = guideContent.style.display === 'none' ? 
                'Show More <i class="bi bi-chevron-down"></i>' : 
                'Show Less <i class="bi bi-chevron-up"></i>';
        });
    }

    // Tab switching functionality
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Update active tab content
            tabContents.forEach(content => content.classList.remove('active'));
            const targetTab = document.getElementById(`${tabId}-tab`);
            if (targetTab) targetTab.classList.add('active');
            
            // Reset any displayed results
            if (resultDiv) resultDiv.style.display = 'none';
            if (errorMessage) errorMessage.style.display = 'none';
            if (imageErrorMessage) imageErrorMessage.style.display = 'none';
        });
    });

    // Image upload handling
    if (dropZone && carImageInput) {
        dropZone.addEventListener('click', () => carImageInput.click());
        
        carImageInput.addEventListener('change', function(e) {
            if (e.target.files.length) {
                handleFiles(e.target.files);
            }
        });
    }
        
    // Drag and drop functionality
    if (dropZone) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, highlight, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, unhighlight, false);
        });
        
        function highlight() {
            dropZone.classList.add('dragover');
        }
        
        function unhighlight() {
            dropZone.classList.remove('dragover');
        }
        
        dropZone.addEventListener('drop', function(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (files.length) {
                handleFiles(files);
            }
        });
    }
    
    function handleFiles(files) {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type.match('image.*')) {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    const imageData = {
                        file: file,
                        dataUrl: e.target.result
                    };
                    uploadedImages.push(imageData);
                    displayImagePreview(imageData, uploadedImages.length - 1);
                };
                
                reader.readAsDataURL(file);
            }
        }
    }
    
    function displayImagePreview(imageData, index) {
        if (!imagePreviewContainer) return;
        
        const previewWrapper = document.createElement('div');
        previewWrapper.className = 'image-preview-wrapper';
        previewWrapper.dataset.index = index;
        
        const img = document.createElement('img');
        img.src = imageData.dataUrl;
        img.className = 'image-preview';
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-image';
        removeBtn.innerHTML = '&times;';
        removeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            removeImage(index);
        });
        
        previewWrapper.appendChild(img);
        previewWrapper.appendChild(removeBtn);
        imagePreviewContainer.appendChild(previewWrapper);
    }
    
    function removeImage(index) {
        if (!imagePreviewContainer) return;
        
        uploadedImages.splice(index, 1);
        imagePreviewContainer.innerHTML = '';
        uploadedImages.forEach((image, i) => {
            displayImagePreview(image, i);
        });
    }

    // Populate makes and models
    const makes = ['Toyota', 'Honda', 'Ford', 'BMW', 'Mercedes'];
    const makeSelect = document.getElementById('make');
    if (makeSelect) {
        makes.forEach(make => {
            const option = document.createElement('option');
            option.value = make;
            option.textContent = make;
            makeSelect.appendChild(option);
        });

        // Update models when make is selected
        makeSelect.addEventListener('change', function() {
            const models = {
                'Toyota': ['Camry', 'Corolla', 'RAV4'],
                'Honda': ['Civic', 'Accord', 'CR-V'],
                'Ford': ['F-150', 'Mustang', 'Explorer'],
                'BMW': ['3 Series', '5 Series', 'X5'],
                'Mercedes': ['C-Class', 'E-Class', 'GLC']
            };

            const modelSelect = document.getElementById('model');
            if (modelSelect) {
                modelSelect.innerHTML = '<option value="">Select Model</option>';
                
                if (this.value && models[this.value]) {
                    models[this.value].forEach(model => {
                        const option = document.createElement('option');
                        option.value = model;
                        option.textContent = model;
                        modelSelect.appendChild(option);
                    });
                }
            }
        });
    }

    // Handle form submission (manual input)
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            try {
                if (loadingSpinner) loadingSpinner.style.display = 'flex';
                if (resultDiv) resultDiv.style.display = 'none';
                if (errorMessage) errorMessage.style.display = 'none';

                const formData = new FormData(this);
                const features = formData.getAll('features[]');

                // Validate form data before sending
                const make = formData.get('make');
                const model = formData.get('model');
                const year = formData.get('year');
                const mileageKm = formData.get('mileage'); // user inputs kilometers
                const condition = formData.get('condition');
                const city = formData.get('city');

                if (!make || !model || !year || !mileageKm || !condition || !city) {
                    throw new Error('Please fill in all required fields');
                }

                console.log('Sending API request with data:', { make, model, year, mileageKm, condition, city, features });

                // Add testing mode fallback - activate if API key is missing or if we're on localhost
                const isTestMode = window.location.hostname === 'localhost' || 
                                 window.location.hostname === '127.0.0.1' || 
                                 !API_KEY || 
                                 API_KEY.length < 20; // Basic API key validation
                
                if (isTestMode) {
                    console.log('Using test mode - simulating API response');
                    // Simulate API response for testing using heuristic estimator
                    // Convert km to miles for internal estimator calculations
                    const mileageMiles = parseFloat(mileageKm) ? parseFloat(mileageKm) / 1.60934 : 0;
                    const estValue = estimateMarketValue(make, model, year, mileageMiles, condition, features, city);
                    const formattedEst = estValue.toLocaleString('en-IN');

                    const mockData = {
                        candidates: [{
                            content: {
                                parts: [{

                                    text: `Estimated Value: ₹${formattedEst}

1. Condition Assessment: The ${condition} condition ${make} ${model} shows typical wear for a ${year} model with ${mileageKm} km.

2. Features Analysis: Selected features (${features.join(', ') || 'standard equipment'}) add value to the vehicle.

3. Value Impact Factors: Year, mileage, and condition are primary factors affecting the estimated value.

4. Market Analysis: Based on current market trends for similar vehicles in your area.`
                                }]
                            }
                        }]
                    };
                    
                    // Simulate network delay
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    const mockResponse = mockData;
                    console.log('Using mock API response:', mockResponse);
                    
                    const mockAiText = mockResponse.candidates[0].content.parts[0].text;
                    
                    // Update the UI with cleaned response
                    const mockAiExplanationElement = document.getElementById('aiExplanation');
                    if (mockAiExplanationElement) {
                        mockAiExplanationElement.innerHTML = cleanAIResponse(mockAiText);
                    }
                    
                    // Show confidence level
                    const mockConfidenceLevelElement = document.getElementById('confidenceLevel');
                    if (mockConfidenceLevelElement) {
                        const confidence = Math.min(95, Math.max(50, 100 - (parseFloat(mileageKm) / 10000)));
                        mockConfidenceLevelElement.style.width = `${confidence}%`;
                    }

                    // Show result
                    if (loadingSpinner) loadingSpinner.style.display = 'none';
                    if (resultDiv) {
                        resultDiv.style.display = 'block';
                        resultDiv.classList.add('show');
                    }
                    return; // Exit early for test mode
                }

                const prompt = `You are a professional car appraiser. Please estimate the value of this vehicle:
Make: ${make}
Model: ${model}
Year: ${year}
Mileage: ${mileageKm} km
                City: ${city}
Condition: ${condition}
Features: ${features.join(', ')}

Provide a detailed response that includes:
1. Estimated Value in INR (formatted as "Estimated Value: ₹X,XXX")
2. Condition Assessment
3. Features Analysis
4. Value Impact Factors
5. Market Analysis

Format your response clearly with each section on a new line.`;

                const requestBody = {
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 1024,
                    },
                    safetySettings: [
                        {
                            category: "HARM_CATEGORY_HARASSMENT",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        },
                        {
                            category: "HARM_CATEGORY_HATE_SPEECH",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        },
                        {
                            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        },
                        {
                            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        }
                    ]
                };

                console.log('Sending request to Gemini API with body:', JSON.stringify(requestBody, null, 2));

                const response = await tryAPIRequest(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody)
                });

                console.log('API Response status:', response.status);

                const data = await response.json();
                console.log('API Response data:', data);
                
                if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
                    throw new Error('Invalid API response format');
                }
                
                const aiText = data.candidates[0].content.parts[0].text;
                
                // Update the UI with cleaned response
                const aiExplanationElement = document.getElementById('aiExplanation');
                if (aiExplanationElement) {
                    aiExplanationElement.innerHTML = cleanAIResponse(aiText);
                }
                
                // Show confidence level
                const confidenceLevelElement = document.getElementById('confidenceLevel');
                if (confidenceLevelElement) {
                    const confidence = Math.min(95, Math.max(70, 100 - (formData.get('mileage') / 10000)));
                    confidenceLevelElement.style.width = `${confidence}%`;
                }

                // Show result
                if (loadingSpinner) loadingSpinner.style.display = 'none';
                if (resultDiv) {
                    resultDiv.style.display = 'block';
                    resultDiv.classList.add('show');
                }

            } catch (error) {
                console.error('Error details:', error);
                if (loadingSpinner) loadingSpinner.style.display = 'none';
                if (errorMessage) {
                    let errorText = 'Error estimating value. Please try again.';
                    
                    // Provide more specific error messages
                    if (error.message.includes('API request failed: 400')) {
                        errorText = 'Invalid request to AI service. Please try again or contact support.';
                    } else if (error.message.includes('API request failed: 401')) {
                        errorText = 'API authentication failed. Please contact support.';
                    } else if (error.message.includes('API request failed: 403')) {
                        errorText = 'API access denied. The service may be unavailable.';
                    } else if (error.message.includes('API request failed: 429')) {
                        errorText = 'Too many requests. Please wait a moment and try again.';
                    } else if (error.message.includes('API request failed')) {
                        // Extract the actual error message if possible
                        const statusMatch = error.message.match(/API request failed: (\d+) - (.+)/);
                        if (statusMatch) {
                            errorText = `API error ${statusMatch[1]}: ${statusMatch[2]}`;
                        } else {
                            errorText = 'API connection failed. Please check your internet connection and try again.';
                        }
                    } else if (error.message.includes('API key')) {
                        errorText = 'API key issue. Please contact support.';
                    } else if (error.name === 'TypeError') {
                        errorText = 'Network error. Please check your connection and try again.';
                    }
                    
                    errorMessage.textContent = errorText;
                    errorMessage.style.display = 'block';
                    
                    // Log additional details for debugging
                    console.log('Form data:', {
                        make: formData.get('make'),
                        model: formData.get('model'),
                        year: formData.get('year'),
                        mileageKm: formData.get('mileage'),
                        condition: formData.get('condition'),
                        city: formData.get('city')
                    });
                }
            }
        });
    }

    // Handle image-based estimation
    if (imageForm) {
        imageForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            try {
                console.log('Starting image-based estimation...');
                console.log('Uploaded images:', uploadedImages.length);
                console.log('API Key present:', !!API_KEY);
                console.log('API Key first 10 chars:', API_KEY ? API_KEY.substring(0, 10) + '...' : 'Not found');
                
                // Reset UI
                if (loadingSpinner) loadingSpinner.style.display = 'flex';
                if (resultDiv) resultDiv.style.display = 'none';
                if (imageErrorMessage) imageErrorMessage.style.display = 'none';

                if (uploadedImages.length === 0) {
                    throw new Error('Please upload at least one image');
                }

                const imageYear = document.getElementById('imageYear')?.value;
                const imageMileage = document.getElementById('imageMileage')?.value;
                const imageCity = document.getElementById('imageCity')?.value;

                // Check if we should use test mode for images too
                const isTestMode = window.location.hostname === 'localhost' || 
                                 window.location.hostname === '127.0.0.1' || 
                                 !API_KEY || 
                                 API_KEY.length < 20;
                
                if (isTestMode) {
                    console.log('Using test mode for image analysis');
                    
                    // Simulate processing time
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    
                    // Use estimator to produce realistic mock for images
                    const selMake = document.getElementById('make')?.value || 'Unknown';
                    const selModel = document.getElementById('model')?.value || 'Unknown';
                    const assumedCondition = uploadedImages.length > 1 ? 'good' : 'fair';
                    const imageMileageKm = imageMileage || 0;
                    const imageMileageMiles = parseFloat(imageMileageKm) ? parseFloat(imageMileageKm) / 1.60934 : 0;
                    const selCity = imageCity || document.getElementById('city')?.value || 'Unknown';
                    const estImgValue = estimateMarketValue(selMake, selModel, imageYear || new Date().getFullYear(), imageMileageMiles, assumedCondition, [], selCity);
                    const formattedImg = estImgValue.toLocaleString('en-IN');

                    const mockResponse = `Estimated Value: ₹${formattedImg}

1. Vehicle Assessment: Based on the uploaded images, this appears to be a well-maintained vehicle in ${selCity}.

2. Condition Analysis: The exterior shows ${uploadedImages.length > 1 ? 'good' : 'fair'} condition with typical wear patterns.

3. Notable Features: Standard equipment visible, ${imageYear ? `${imageYear} model year` : 'recent model'} with ${imageMileage ? `${imageMileage} km` : 'moderate usage'}.

4. Value Factors: Image quality and multiple angles ${uploadedImages.length > 1 ? 'improve' : 'limit'} assessment accuracy.`;

                    // Process AI response
                    const aiResponse = cleanAIResponse(mockResponse);
                    
                    // Update UI
                    const aiExplanationElement = document.getElementById('aiExplanation');
                    if (aiExplanationElement) {
                        aiExplanationElement.innerHTML = aiResponse;
                    }
                    
                    // Calculate confidence
                    const confidence = Math.min(95, 
                        70 + // Base confidence
                        (uploadedImages.length * 5) + // More images = higher confidence
                        (imageYear ? 10 : 0) + // Year provided
                        (imageMileage ? 10 : 0) // Mileage provided
                    );
                    
                    const confidenceLevelElement = document.getElementById('confidenceLevel');
                    if (confidenceLevelElement) {
                        confidenceLevelElement.style.width = `${confidence}%`;
                    }

                    // Show result
                    if (loadingSpinner) loadingSpinner.style.display = 'none';
                    if (resultDiv) {
                        resultDiv.style.display = 'block';
                        resultDiv.classList.add('show');
                    }
                    
                    return; // Exit early for test mode
                }

                // First, test the API key with a simple request
                console.log('Testing API key with simple request...');
                try {
                    const testResponse = await tryAPIRequest(API_URL, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            contents: [{
                                parts: [{
                                    text: "Hello, this is a test."
                                }]
                            }]
                        })
                    });
                    console.log('API key test successful');
                } catch (testError) {
                    console.error('API key test failed:', testError);
                    throw new Error(`API key validation failed: ${testError.message}`);
                }

                // Convert images to smaller size and proper format
                const processedImages = await Promise.all(uploadedImages.map(async (image) => {
                    // Create temporary image element
                    const img = new Image();
                    img.src = image.dataUrl;
                    await new Promise(resolve => img.onload = resolve);

                    // Create canvas for image processing
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    // Calculate new dimensions (max 800px width/height)
                    let width = img.width;
                    let height = img.height;
                    const maxSize = 800;

                    if (width > maxSize || height > maxSize) {
                        if (width > height) {
                            height = Math.round((height * maxSize) / width);
                            width = maxSize;
                        } else {
                            width = Math.round((width * maxSize) / height);
                            height = maxSize;
                        }
                    }

                    // Set canvas size and draw image
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert to base64 with reduced quality
                    return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
                }));

                // Prepare the API request
                const requestPayload = {
                    contents: [{
                        parts: [
                            {
                                text: `As a professional car appraiser, analyze these images and provide:
                                    1. Estimated market value in INR (format as "Estimated Value: ₹X,XXX")
                                    2. Detailed condition assessment
                                    3. Notable features or damage affecting value
                                    
                                    Additional details:
                                    ${imageYear ? `Year: ${imageYear}` : 'Year: Unknown'}
                                    ${imageMileage ? `Mileage: ${imageMileage}` : 'Mileage: Unknown'}
                                `
                            },
                            ...processedImages.map(imageData => ({
                                inline_data: {
                                    mime_type: 'image/jpeg',
                                    data: imageData
                                }
                            }))
                        ]
                    }]
                };

                console.log('Making vision API request...');
                console.log('Payload structure:', JSON.stringify({
                    contents: requestPayload.contents.length,
                    parts: requestPayload.contents[0].parts.length,
                    hasImages: requestPayload.contents[0].parts.some(p => p.inline_data)
                }));

                // Make API request (use vision model for image analysis)
                const response = await tryAPIRequest(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestPayload),
                    signal: AbortSignal.timeout(30000) // 30 second timeout
                });

                const data = await response.json();
                
                if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
                    throw new Error('Invalid API response format');
                }

                // Process AI response
                const aiResponse = cleanAIResponse(data.candidates[0].content.parts[0].text);
                
                // Update UI
                const aiExplanationElement = document.getElementById('aiExplanation');
                if (aiExplanationElement) {
                    aiExplanationElement.innerHTML = aiResponse;
                }
                
                // Calculate confidence based on number of images and provided details
                const confidence = Math.min(95, 
                    70 + // Base confidence
                    (uploadedImages.length * 5) + // More images = higher confidence
                    (imageYear ? 10 : 0) + // Year provided
                    (imageMileage ? 10 : 0) // Mileage provided
                );
                
                const confidenceLevelElement = document.getElementById('confidenceLevel');
                if (confidenceLevelElement) {
                    confidenceLevelElement.style.width = `${confidence}%`;
                }

                // Show result
                if (loadingSpinner) loadingSpinner.style.display = 'none';
                if (resultDiv) {
                    resultDiv.style.display = 'block';
                    resultDiv.classList.add('show');
                }

            } catch (error) {
                console.error('Error:', error);
                if (loadingSpinner) loadingSpinner.style.display = 'none';
                if (imageErrorMessage) {
                    imageErrorMessage.textContent = error.message || 'Error processing images. Please try again.';
                    imageErrorMessage.style.display = 'block';
                }
            }
        });
    }
});