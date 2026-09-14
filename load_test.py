"""
🚀 Kubernetes Horizontal Pod Autoscaler (HPA) Traffic & Load Generator
Simulates realistic concurrent user traffic to trigger Kubernetes Auto-Scaling in real time.
"""
import time
import argparse
import urllib.request
import urllib.error
import concurrent.futures

def send_request(url: str, request_id: int):
    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": f"K8s-Traffic-Generator-Thread-{request_id}"}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            return response.status
    except Exception as e:
        return "error"

def run_load_test(target_url: str, concurrency: int, duration_seconds: int):
    print("=" * 70)
    print(f"🔥 STARTING TRAFFIC LOAD GENERATION ON: {target_url}")
    print(f"⚡ Concurrent Worker Threads: {concurrency}")
    print(f"⏱️  Duration: {duration_seconds} seconds")
    print("👀 Open another terminal and run: kubectl get hpa --watch")
    print("=" * 70)

    start_time = time.time()
    total_requests = 0
    success_count = 0
    error_count = 0

    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
        while (time.time() - start_time) < duration_seconds:
            # Submit a batch of concurrent requests
            futures = [
                executor.submit(send_request, target_url, i)
                for i in range(concurrency)
            ]
            for future in concurrent.futures.as_completed(futures):
                status = future.result()
                total_requests += 1
                if status == 200:
                    success_count += 1
                else:
                    error_count += 1

            elapsed = int(time.time() - start_time)
            rps = int(total_requests / max(1, elapsed))
            print(f"\r⏳ Elapsed: {elapsed}s/{duration_seconds}s | Sent: {total_requests} requests | Rate: ~{rps} req/sec", end="", flush=True)

    print("\n" + "=" * 70)
    print("✅ LOAD TEST COMPLETED!")
    print(f"📊 Summary: {total_requests} total requests | {success_count} success | {error_count} errors")
    print("❄️ Traffic stopped. Kubernetes will cooldown and scale replicas back down in ~5 minutes.")
    print("=" * 70)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Kubernetes HPA Load Generator")
    parser.add_argument(
        "--url",
        type=str,
        default="http://localhost:5001/health",
        help="Target microservice URL (default: http://localhost:5001/health)"
    )
    parser.add_argument(
        "--concurrency",
        type=int,
        default=40,
        help="Number of concurrent traffic threads (default: 40)"
    )
    parser.add_argument(
        "--duration",
        type=int,
        default=60,
        help="Test duration in seconds (default: 60)"
    )

    args = parser.parse_args()
    run_load_test(args.url, args.concurrency, args.duration)
