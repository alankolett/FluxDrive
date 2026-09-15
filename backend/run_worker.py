import logging
import time
from backend.app.worker import worker_instance

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)

if __name__ == "__main__":
    print("Starting FluxDrive Independent Queue Worker...")
    worker_instance.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Stopping worker...")
        worker_instance.stop()
