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
from fastapi import FastAPI, Request, HTTPException, Header, Response, BackgroundTasks
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

def run_deployment(branch: str, commit_msg: str):
    """Execute git pull and docker compose build & up in background."""
    logger.info(f"🚀 [Deployment Started] Branch: '{branch}' | Commit: '{commit_msg}'")
    try:
        # Pull latest commits
        pull_result = subprocess.run(
            ["git", "pull", "origin", branch],
            capture_output=True,
            text=True
        )
        if pull_result.returncode != 0:
            logger.warning(
                f"⚠️ Git pull warning (exit {pull_result.returncode}):\n{pull_result.stderr.strip()}\n"
                f"(If using HTTPS, ensure GitHub credentials/tokens are updated in Windows Credential Manager)."
            )
        else:
            logger.info(f"Git pull output:\n{pull_result.stdout.strip()}")

        # Rebuild and restart microservices with zero downtime
        compose_result = subprocess.run(
            ["docker", "compose", "up", "-d", "--build"],
            capture_output=True,
            text=True,
            check=True
        )
        logger.info(f"Docker compose output:\n{compose_result.stdout.strip()}")
        logger.info(f"✅ [Deployment Completed Successfully] Branch: '{branch}'")
    except subprocess.CalledProcessError as err:
        logger.error(f"❌ Docker compose failed: {err.stderr}")
    except Exception as exc:
        logger.error(f"❌ Unexpected error during deployment: {exc}")

@app.get("/")
def root():
    return {
        "message": "GitHub Webhook Deployment Server is running.",
        "endpoints": {
            "health": "/health",
            "webhook": "/webhook (POST only)",
            "docs": "/docs"
        }
    }

@app.get("/favicon.ico")
def favicon():
    """Silence browser favicon 404 warnings."""
    return Response(status_code=204)

@app.get("/health")
@app.get("/health/")
def health_check():
    return {"status": "healthy", "service": "github_webhook_server"}

@app.post("/")
@app.post("/webhook")
async def handle_github_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_hub_signature_256: str = Header(None),
    x_github_event: str = Header(None)
):
    body = await request.body()
    
    # 1. Cryptographic Security Check
    if not verify_signature(body, x_hub_signature_256):
        logger.warning("Rejected webhook request: Invalid HMAC-SHA256 signature.")
        raise HTTPException(status_code=403, detail="Invalid HMAC-SHA256 Signature")

    # 2. Handle GitHub ping test event
    if x_github_event == "ping":
        logger.info("Received GitHub ping event. Webhook connection verified successfully!")
        return {
            "status": "success",
            "event": "ping",
            "message": "Pong! Webhook connection verified successfully."
        }

    payload = await request.json()
    ref = payload.get("ref", "")
    head_commit = payload.get("head_commit") or {}
    commit_msg = head_commit.get("message", "N/A")
    pusher = (payload.get("pusher") or {}).get("name", "Unknown")

    logger.info(f"Received valid push event on {ref} by {pusher}: '{commit_msg}'")

    # 3. Trigger auto-deployment on target branches ('Raj' or 'main')
    if "refs/heads/Raj" in ref or "refs/heads/main" in ref:
        branch = "Raj" if "Raj" in ref else "main"
        # Run deployment in background to respond to GitHub immediately (<10s limit)
        background_tasks.add_task(run_deployment, branch, commit_msg)

        return {
            "status": "queued",
            "branch": branch,
            "commit": commit_msg,
            "message": f"Deployment for branch '{branch}' successfully queued in background."
        }

    return {"status": "ignored", "reason": f"Push on {ref} ignored."}

if __name__ == "__main__":
    port = int(os.getenv("WEBHOOK_PORT", 9000))
    print(f"GitHub Webhook Server listening on port {port}...")
    print("Webhook secret configured.")
    uvicorn.run(app, host="0.0.0.0", port=port)

