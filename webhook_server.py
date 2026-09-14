"""
🚀 GitHub Webhook Automated CI/CD Deployment Server
Listens for GitHub push events, validates HMAC-SHA256 secret tokens,
and triggers automatic microservice rebuilding & deployment.
"""
import os
import hmac
import hashlib
import subprocess
import logging
from fastapi import FastAPI, Request, HTTPException, Header
import uvicorn

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("webhook_server")

app = FastAPI(
    title="GitHub Webhook Deployment Server",
    description="Automated CI/CD webhook receiver for Car-Loan-Calculator",
    version="1.0.0"
)

# Set the secret token matching what you enter in GitHub Settings -> Webhooks
WEBHOOK_SECRET = os.getenv("GITHUB_WEBHOOK_SECRET", "my_secure_carloan_webhook_secret_123")

def verify_signature(payload_body: bytes, signature_header: str) -> bool:
    """Validate that the webhook request genuinely originated from GitHub using HMAC-SHA256."""
    if not signature_header:
        return False
    try:
        sha_name, signature = signature_header.split("=")
        if sha_name != "sha256":
            return False
        mac = hmac.new(WEBHOOK_SECRET.encode("utf-8"), msg=payload_body, digestmod=hashlib.sha256)
        return hmac.compare_digest(mac.hexdigest(), signature)
    except Exception as e:
        logger.error(f"Error parsing signature: {e}")
        return False

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "github_webhook_server"}

@app.post("/webhook")
async def handle_github_webhook(request: Request, x_hub_signature_256: str = Header(None)):
    body = await request.body()
    
    # 1. Cryptographic Security Check
    if not verify_signature(body, x_hub_signature_256):
        logger.warning("Rejected webhook request: Invalid HMAC-SHA256 signature.")
        raise HTTPException(status_code=403, detail="Invalid HMAC-SHA256 Signature")

    payload = await request.json()
    ref = payload.get("ref", "")
    commit_msg = payload.get("head_commit", {}).get("message", "N/A")
    pusher = payload.get("pusher", {}).get("name", "Unknown")

    logger.info(f"Received valid push event on {ref} by {pusher}: '{commit_msg}'")

    # 2. Trigger auto-deployment on target branches ('Raj' or 'main')
    if "refs/heads/Raj" in ref or "refs/heads/main" in ref:
        branch = "Raj" if "Raj" in ref else "main"
        logger.info(f"🚀 Deploying latest code from branch '{branch}'...")
        try:
            # Pull latest commits
            pull_result = subprocess.run(
                ["git", "pull", "origin", branch],
                capture_output=True,
                text=True,
                check=True
            )
            logger.info(f"Git pull output:\n{pull_result.stdout}")

            # Rebuild and restart microservices with zero downtime
            compose_result = subprocess.run(
                ["docker", "compose", "up", "-d", "--build"],
                capture_output=True,
                text=True,
                check=True
            )
            logger.info(f"Docker compose output:\n{compose_result.stdout}")

            return {
                "status": "deployed",
                "branch": branch,
                "commit": commit_msg,
                "message": "Microservices successfully updated & redeployed!"
            }
        except subprocess.CalledProcessError as err:
            logger.error(f"Deployment command failed: {err.stderr}")
            return {"status": "error", "detail": err.stderr}

    return {"status": "ignored", "reason": f"Push on {ref} ignored."}

if __name__ == "__main__":
    port = int(os.getenv("WEBHOOK_PORT", 9000))
    print(f"👂 GitHub Webhook Server listening on port {port}...")
    print(f"🔑 Webhook Secret configured: {WEBHOOK_SECRET}")
    uvicorn.run(app, host="0.0.0.0", port=port)
