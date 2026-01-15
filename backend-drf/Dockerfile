# Purpose: A Dockerfile is a step-by-step instruction file that tells Docker how to build and run our application.

# Base image: python 3.10 slim version (lightweight version of python) from docker hub
FROM python:3.10-slim

# show logs on terminal 
ENV PYTHONUNBUFFERED=1
# prevent Python from writing .pyc files to disc
ENV PYTHONDONTWRITEBYTECODE=1

# root directory inside the container
WORKDIR /app

# Install system dependencies
# gcc → C compiler, needed to build some Python packages (like psycopg2)
# libpq-dev → PostgreSQL client library, needed for Django to connect to PostgreSQL
# rm -rf /var/lib/apt/lists/* → cleans package cache to reduce image size
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# copy requirements file
#  dote used to place the requrements.txt in the workdir /app
# Why copy only requirements first:Docker caches layers If requirements.txt doesn’t change, Docker won’t reinstall packages → speeds up builds

COPY requirements.txt .

# install python dependencies

RUN pip install --no-cache-dir -r requirements.txt

# copy project files to the workdir /app
COPY . .


# expose port 8000 to the outside world
EXPOSE 8000


# CMD → default command to run when the container starts
# Gunicorn → production-ready Django server (faster & more reliable than python manage.py runserver)
# gunicorn = production server, clickmart_main.wsgi:application = Django entry point (wsgi.py),
#  --bind 0.0.0.0:8000 → listen on all network interfaces (important inside Docker!)

# A worker is just one instance of your Django app running inside Gunicorn.
# --timeout 180 → wait 3 minutes before killing a stuck request
# Gunicorn waits 180 seconds (3 minutes) for a worker process to respond before it kills it.
# If a request takes longer than 180 seconds, Gunicorn assumes something went wrong (stuck request) and restarts the worker.
CMD ["gunicorn", "clickmart_main.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3" , "--timeout", "180"]