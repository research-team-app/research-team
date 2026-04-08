# stage 1: Builder
FROM public.ecr.aws/docker/library/python:3.12.0-slim-bullseye AS builder

# get UV
COPY --from=ghcr.io/astral-sh/uv:latest /uv  /bin/

# installing package
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev

# Copy code and do the final sync to "install" your researchteam project
COPY . .
RUN uv sync --frozen --no-dev


 # stage 2: Runner
FROM public.ecr.aws/docker/library/python:3.12.0-slim-bullseye

WORKDIR /app

# Add AWS Lambda Web Adapter
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1 /lambda-adapter /opt/extensions/lambda-adapter

# copying rest of the code
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app /app

# We must add the virtual environment's 'bin' folder to the PATH
ENV PATH="/app/.venv/bin:$PATH"

# minimize python bloat
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# exposing port
EXPOSE 8080

# running the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]