# DevOps
# React and  Django Production Deployment (Step-by-Step)
### Docker + PostgreSQL + GitHub Actions (CI/CD) + Oracle server + Nginx + Gunicorn + Custom Domain + SSL

This repository demonstrates how to deploy a **Django application**  with **React** from local development to **production** using:
- Django  
- Docker & Docker Compose  
- PostgreSQL  
- GitHub Actions (CI/CD)  
- Oracle cloud server   
- Nginx
- Gunicorn
- Custom Domain
- SSL (Let’s Encrypt)


You will go step-by-step from:

**Local → Docker → GitHub → oracle server → Domain → HTTPS**



## Prerequisites

Install the following on your system:

- Git
- Python 3.10+  
- pip  
- Docker Desktop  
- VS Code (recommended)

## Step 1 — Clone the Project
```sh
git clone git@github.com:KIWOLY/e-commerce.git
cd e-commerce

```



## Run Django Locally (Without Docker)
Create virtual environment
```sh
cd backend-drf
python3 -m venv env
source env/bin/activate     # Mac / Linux
# OR
env\Scripts\activate        # Windows
```

Install dependencies
```sh
pip install -r requirements.txt
```

Create ```.env``` file
```sh
DEBUG=True
SECRET_KEY=<YOUR-SECRET-KEY>

# Database Settings
DB_NAME=<DATABASE-NAME>
DB_USER=<POSTGRES-USERNAME>
DB_PASSWORD=<YOUR-PASSWORD>
DB_HOST=localhost
DB_PORT=5432

# Email Configuration
EMAIL_HOST_USER=<YOUR-EMAIL-ADDRESS>
EMAIL_HOST_PASSWORD=<PASSWORD> # USE APP PASSWORD IF YOU ARE USING GMAIL
```

Create database tables and run the Django server
```sh
python manage.py migrate
python manage.py runserver
```

Create ```.env``` file inside /frontend/ directory and write:
```sh
VITE_SERVER_BASE_URL=http://127.0.0.1:8000/api/v1
```
And run the frontend - React
```sh
npm install
npm run dev
```

Go to http://localhost:5173/

Optional: You can now create superuser and add some products.

To learn about deployment, continue to next step...

## Install and verify Docker and Docker Compose
```sh
docker --version
docker compose version
```

## Create Dockerfile for backend
Create a new file "Dockerfile" inside /backend-drf/ folder
```sh
# Purpose: A Dockerfile is a step-by-step instruction file that tells Docker how to build and run our application.
FROM python:3.10-slim

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# gunicorn = production server, clickmart_main.wsgi:application = Django entry point, --bind 0.0.0.0:8000 = external traffic. Reminaing: tuning options
# A worker is just one instance of your Django app running inside Gunicorn.
CMD ["gunicorn", "clickmart_main.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3" , "--timeout", "180"]
```

## Create Dockerfile for frontend
Create a new file "Dockerfile" inside /frontend/ folder
```sh
# Stage 1: Build
FROM node:18 AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build arguments for environment variables
ARG VITE_SERVER_BASE_URL

# This line passes an environment variable into the Docker container so the React app knows the backend API URL.
ENV VITE_SERVER_BASE_URL=$VITE_SERVER_BASE_URL

RUN npm run build

# Stage 2: Nginx, alpine means the lighter version of Nginx
FROM nginx:alpine

# Copy build output to Nginx html directory
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## On the root directory, create a file "docker-compose.yml"
```sh
services:
  db:
    image: postgres:16-alpine
    env_file:
      - .env.production
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./backend-drf
    ports:
      - "8000:8000"
    env_file:
      - ./backend-drf/.env.docker
    depends_on:
      - db
    volumes:
      - ./backend-drf/static:/app/static
      - ./backend-drf/media:/app/media
    command: >
      sh -c "python manage.py collectstatic --noinput &&
             python manage.py migrate &&
             python manage.py runserver 0.0.0.0:8000"

  frontend:
    build:
      context: ./frontend
      args:
        VITE_SERVER_BASE_URL: "http://backend:8000/api/v1"
    ports:
      - "5173:80"
    depends_on:
      - backend


# This creates a named Docker volume to permanently store PostgreSQL data.
# Without this:
  # Database data is stored inside the container
  # If container is deleted → data is lost
# With this:
  # Data is stored in a Docker-managed volume
  # Data persists even if container stops or restarts
volumes:
  postgres_data:
```

Make sure to create a copy of ```.env``` and name it as ```.env.docker```
```sh
SECRET_KEY=<YOUR-DJANGO-SECRETKEY>
DEBUG=True

# Database Settings
DB_NAME=<YOUR_DOCKER-DB>
DB_USER=postgres
DB_PASSWORD=<PASSWORD>
DB_HOST=db
DB_PORT=5432


EMAIL_HOST_USER=<YOUR-EMAIL-ADDRESS>
EMAIL_HOST_PASSWORD=<YOUR-PASSWORD> # app password if you're using Gmail account
```

Run this command to Dockerize your project:
```sh
docker compose up --build
```
Your project is now Dockerized 

See the docker container health:
```sh
docker compose ps
```

You can try creating superuser inside Docker container.
```sh
docker compose exec backend python manage.py createsuperuser
```



## Create Oracle Cloud Compute Instance

1. Go to OCI Console → **Compute** → **Instances** → **Create instance**
2. Name: `ecommerce-prod` (or your choice)
3. Image & shape: **Ubuntu 22.04** or **24.04** + **VM.Standard.A1.Flex** (4 OCPU + 24 GB – Always Free)
4. Networking: Use a **public subnet**
5. **Add SSH key** (choose one):
   - Let OCI generate → download private key
   - Or paste your public key:

```bash
# On your local machine
ssh-keygen -t ed25519 -C "ecommerce-oracle" -f ~/.ssh/ecommerce_oracle
cat ~/.ssh/ecommerce_oracle.pub   # ← copy this content

Create instance → wait 2–5 minutes → copy the Public IP

2. Connect via SSH
Bash# Using OCI generated key
ssh -i ~/Downloads/oci_key opc@<PUBLIC_IP>

# Or your own key
chmod 400 private key
ssh -i ~/.ssh/ecommerce_oracle opc@<PUBLIC_IP>
Update system first:
Bashsudo apt update && sudo apt upgrade -y


3. Install Docker & Docker Compose
Bash# Install Docker
curl -fsSL https://get.docker.com | sudo sh

# Docker Compose plugin
sudo apt install -y docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER

# Log out & log back in
exit
Reconnect after logout:
Bashssh -i ~/.ssh/ecommerce_oracle opc@<PUBLIC_IP>


4. Clone the Project
Bashcd /opt
sudo mkdir ecommerce
sudo chown $USER:$USER ecommerce
cd ecommerce
git clone https://github.com/YOUR-USERNAME/YOUR-REPO.git .


5. Configure Environment Variables
Frontend (in docker-compose.yml)
YAMLservices:
  frontend:
    environment:
      - VITE_SERVER_BASE_URL=http://<PUBLIC_IP>:8000/api/v1
Backend environment files
Create/edit these files:
Bashnano backend/.env.production
nano backend/.env.docker
Example content for .env.docker / .env.production:
textDEBUG=False
ALLOWED_HOSTS=<PUBLIC_IP>,localhost,127.0.0.1
SECRET_KEY=your-super-long-random-secret-key-here
# ... database credentials, stripe keys, etc.


6. :warning: Firewall Configuration (Very Important!)
A. OCI Security List (Networking level)

Go to your instance → Primary VNIC → click Subnet
Open Default Security List (or assigned one)
Add Ingress Rules:
TCP | Port 22 | 0.0.0.0/0 (usually already exists)
TCP | Port 8000 | 0.0.0.0/0
TCP | Port 5173 | 0.0.0.0/0


B. Instance Firewall (iptables)
for the oracle server if you use linux image
make sure you update and open also the linux firewalls   ufw for port 22 80 443

# Make rules persistent
sudo apt update
sudo apt install -y iptables-persistent

# During installation → choose YES to save current IPv4 rules
# Or later:
sudo netfilter-persistent save
Verify:
Bashsudo iptables -L -v -n
7. Build & Start Containers
Bashdocker compose up --build -d
docker compose ps
8. Test Your Deployment

Backend API → http://<PUBLIC_IP>:8000/
Frontend → http://<PUBLIC_IP>:5173/
Django Admin (if enabled) → http://<PUBLIC_IP>:8000/admin/

9. Important Django & CORS Settings
In your Django settings.py:
ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")


CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    f"http://{os.getenv('PUBLIC_IP', '<your-ip-here>')}:5173",
    # "https://yourdomain.com" ← add later
]


Push to GitHub:
```sh
git add .
git commit -m "Allowed host & environments added"
git push origin main
```

This will push the changes to GitHub.

###  Goal - Whenever I push code to GitHub, my oracle server should automatically update.

But first...

### Manually pull the code from GitHub to oracle server .
While logged-in to oracle server :
```sh
git pull origin main
```

Rebuild containers:
```sh
docker compose down -v
docker compose up --build -d
```

## Rule Before Automation
❗Never automate something you haven’t done manually.


## Setup CI/CD (GitHub Actions)
In local project:

Create a new file:  

```sh
.github/workflows/automate.yml
```
```sh
name: Auto Deploy to Oracle Cloud Server

on:
  push:
    branches:
      - master

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.ORACLE_HOST }}
          username: ${{ secrets.ORACLE_USER }}
          key: ${{ secrets.ORACLE_SSH_KEY }}
          script: |
            cd e-commerce
            git pull origin master
            docker compose up --build -d

```

Add GitHub Secrets:
GitHub → Your Repository → Settings → Secrets and variables → Actions → New repository secret .

```
Required GitHub Secrets

The following secrets must be configured in the GitHub repository to allow secure deployment:

Secret Name	Description
ORACLE_HOST	Public IP address of the Oracle Cloud VM
ORACLE_USER	SSH username (usually ubuntu)
ORACLE_SSH_KEY	Private SSH key for connecting to the Oracle server

Important Notes

     The SSH key must be the full private key content, not the filename

     Root login is disabled on Oracle Cloud — always use the ubuntu user
```

## Push automation file:
```sh
git add .
git commit -m "CI/CD Setup"
git push origin main
```

Check GitHub Actions tab.
```sh
Deployment Process

On every push to the master branch, GitHub Actions will automatically:

Connect to the Oracle Cloud server via SSH

Navigate to the application directory

Pull the latest code from the GitHub repository

Build and restart the Docker containers using Docker Compose
```

Make a small frontend change and confirm auto-deploy.

✅ Auto deploy successful.


## Nginx Config
From local project, create file:
```sh
nginx/default.conf
```
```
server {
    listen 80;

    # Frontend (React)
    location / {
        proxy_pass http://frontend:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Backend (Django)
    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Django admin & static
    location /admin/ {
        proxy_pass http://backend:8000;
    }

    location /static/ {
        proxy_pass http://backend:8000;
    }

    location /media/ {
        proxy_pass http://backend:8000;
    }
}
```
### Docker Compose Changes
- Add nginx service
- Remove ports from backend & frontend
- Update frontend API URL: ``` VITE_SERVER_BASE_URL="/api/v1" ```

```
nginx:
  image: nginx:alpine
  ports:
    - "80:80"
  volumes:
    - ./nginx/default.conf:/etc/nginx/conf.d/default.conf
  depends_on:
    - frontend
    - backend
```

Push changes:
```sh
git add .
git commit -m "Nginx Setup"
git push origin main
```

## Update Firewall (Production)
Keep:
- ```22``` (SSH)
- ```80``` (HTTP)

Remove:
- ```8000``` (Backend)
- ```5173``` (Frontend)

## Final Test
http://<LINODE_IP>/

If you get error: Add ```backend``` to allowed host in linode server manually.

Restart docker:
```sh
docker compose down -v
docker compose up --build -d
```

## Gunicorn Setup (Production WSGI Server)

### 1. Add Gunicorn Dependency
Add `gunicorn` inside `requirements.txt`:


#### Update Backend Dockerfile

No special change is required other than ensuring requirements.txt is installed.
Gunicorn will be installed automatically via dependencies.

#### Update docker-compose.yml
Replace the Django run command with Gunicorn:
```
command: >
  gunicorn clickmart_main.wsgi:application --bind 0.0.0.0:8000 --workers 3
```
- e-commerce.wsgi:application → Django entry point
- --bind 0.0.0.0:8000 → Listen on all interfaces
- --workers 3 → Run 3 Python worker processes

```
git add .
git commit -m "Deploy Gunicorn"
git push origin main
```

#### Important Note
✅ We did not change the application code.

✅ We only changed how Python code is executed in production.

### Verify Gunicorn Is Running
SSH into the oracle server:
```
ssh root@<LINODE_IP>
cd e-commerce
cd backend-drf
docker compose logs backend


output will be  like
backend-1  | Not Found: /static/admin/css/base.css
backend-1  | Not Found: /static/admin/css/nav_sidebar.css
backend-1  | Not Found: /static/admin/css/dark_mode.css
backend-1  | Not Found: /static/admin/css/responsive.css
backend-1  | Not Found: /static/admin/js/theme.js
backend-1  | Not Found: /static/admin/css/dashboard.css
backend-1  | Not Found: /static/admin/js/nav_sidebar.js
backend-1  | Not Found: /static/admin/css/responsive.css
backend-1  | Not Found: /static/admin/css/nav_sidebar.css
backend-1  | Not Found: /static/admin/css/dashboard.css

POINT TO NOTE Gunicorn DOEST NOT COLLECT STATICS FILE AS runserver  ADD SETTING ON THE Nginx SO AS TO
COLLECT THE STATIC FILE 
```

## Purchase a Domain

Purchase a domain from any provider (GoDaddy, Namecheap, etc.).

Connect Domain to oracle server(DNS)
Add the following A records in your domain DNS:
| Type | Host | Value              |
| ---- | ---- | ------------------ |
| A    | @    | `<YOUR_ORACLE_SERVER_IP>` |
| A    | www  | `<YOUR_ORACLE_SERVER_IP>` |

Wait for DNS propagation (usually a few minutes to a few hours).

```
Nginx Domain & SSL Notice

Important: After adding your domain name, do NOT modify default.conf locally.

All Nginx configuration changes, including SSL setup, must be done on the server.

Why

When you push code to GitHub and redeploy, local changes to default.conf will be overwritten.

SSL certificates and settings are server-specific. Any local modifications will be lost.

To apply SSL after updates, you must re-run the SSL setup command on the server.

Recommendation

Add your domain and configure SSL directly on the server.

Keep default.conf in GitHub as-is.

Whenever you make server-side changes to SSL or Nginx, do not push those changes to GitHub.
so add nginx in  the .gitignore

This ensures your SSL stays valid and your domain configuration is not accidentally reset.
```

### Nginx Config as Server-Managed File
Certbot modifies the Nginx config directly on the server,
so we must remove it from Git tracking.
```
git rm --cached nginx/default.conf
```
- Removes the file from Git

Add to .gitignore:
```
nginx/default.conf
```

#### Commit and Push
```
git add .
git commit -m "Make nginx config server-managed"
git push origin main
```

#### SSH into oracle server
- Create `nginx/default.conf` file
- Add domain to this file:
```
server_name example.com www.example.com;
```
Restart nginx:
```
docker compose restart nginx
```
#### Update Django ALLOWED_HOSTS
Add your domain into `.env.docker`

Restart backend:
```
docker compose restart backend
```
### Test Domain (HTTP only
http://example.com

```
Serving Django with Gunicorn and Nginx
Issue

After switching to Gunicorn to serve Django in production, the app works but static files (CSS, JS, images) are not loading.

Gunicorn only serves dynamic content and does not handle static files.

Solution

Use Nginx as a reverse proxy to handle static files and forward dynamic requests to Gunicorn.

Nginx serves static content directly, improving performance and making the app fully accessible via the browser.

Docker Setup
nginx:
  image: nginx:alpine
  ports:
    - "80:80"
  volumes:
    - ./nginx/default.conf:/etc/nginx/conf.d/default.conf
    - ../backend-drf/static:/static
  depends_on:
    - frontend
    - backend

Nginx Config Example (default.conf)
server {
    listen 80;
    server_name 130.61.117.245 www.cognitech.tlms.live;

    location /static/ {
        alias /static/;   # Serve Django static files
    }

    location / {
        proxy_pass http://backend:8000;  # Forward dynamic requests to Gunicorn
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Install SSL (Let’s Encrypt)

In the server root directory, create folders:
```
mkdir -p certbot/www
mkdir -p certbot/conf
```
### Update docker-compose.yml (Nginx service)
Edit docker-compose.yml locally (nginx service):
```
volumes:
  - ./certbot/www:/var/www/certbot
  - ./certbot/conf:/etc/letsencrypt
```
Push to main branch.

### Update nginx/default.conf
Edit `nginx/default.conf`

Add this block:
```
location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
```

Restart Nginx container:
```
docker compose restart nginx
```
Make sure the site with HTTP still works at this point:

### Install Certbot
```
apt update
apt install certbot -y
```

### Get SSL Certificate (WEBROOT METHOD)
```
sudo certbot certonly \
  --webroot \
  -w /home/ubuntu/e-commerce/certbot/www \
  -d cognitech.tlms.live \
  -d www.cognitech.tlms.live

```

### Enable HTTPS in Nginx
Edit `nginx/default.conf` again:

Replace with FINAL CONFIG:
```
# Redirect all HTTP to HTTPS
server {
    listen 80;
    server_name cognitech.tlms.live www.cognitech.tlms.live;
    return 301 https://$host$request_uri;
}

# HTTPS server
server {
    listen 443 ssl;
    server_name cognitech.tlms.live www.cognitech.tlms.live;

    # SSL certificate
    ssl_certificate /etc/letsencrypt/live/cognitech.tlms.live/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cognitech.tlms.live/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://frontend:80;
    }

    # API
    location /api/ {
        proxy_pass http://backend:8000;
    }

    # Admin
    location /admin/ {
        proxy_pass http://backend:8000;
    }

    # Static files
    location /static/ {
        alias /static/;
    }
}


```

```
in case you geting error on the nginx container

make sure your nginx service in the docker compose look like this

nginx:
   image: nginx:alpine
   ports:
     - "80:80"
   volumes:
     - ./nginx/default.conf:/etc/nginx/conf.d/default.conf
     - ./backend-drf/static:/static
     - ./certbot/www:/var/www/certbot
     - /etc/letsencrypt/:/etc/letsencrypt:ro                  
   depends_on:
     - frontend
     - backend


```




#### Restart Nginx
docker compose restart nginx

#### Test HTTPS 
https://example.com

Congratulations  You did it.

# Fixing Media Files in Production (Docker + Nginx + Django)

This guide explains how to fix issues where **media files (uploaded images)** are not loading correctly in production.

---

### Step 1: Update Nginx Configuration (Server)

1. Login to your production server.
2. Open the Nginx config file:

```bash
nano nginx/default.conf
```

3. Add the following block inside the HTTPS server block:
```
location /media/ {
    alias /media/;
}
```
This tells Nginx to serve uploaded media files directly.
4. Restart nginx container:
```
docker compose restart nginx
```

### Step 2: Mount Media Folder in Docker (Local Project)
1. Open `docker-compose.yml` - in your local project
2. Inside the nginx service, add the media volume mapping:
```
nginx:
    volumes:
      - ./backend-drf/media:/media
```
This allows the Nginx container to access uploaded media files created by Django.

3. Commit and push the changes:
```
git add .
git commit -m "Serve media files using nginx"
git push origin main
```

### Step 3: Verify Media Files
Try opening a media file directly in the browser:
```
https://your-domain.com/media/example.jpg
```
If the image loads, media serving is working correctly.

### Step 4 (Fallback): Fix Serializer Image URL
If media files load directly but still do not appear on the webpage, update the serializer to return a relative media path.

1. Open `products/serializers.py`
3. Update `ProductSerializer` - or whatever serializer the image is coming from.
Refer to below code:
```
from rest_framework import serializers

class ProductSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = "__all__"

    def get_image(self, obj):
        return obj.image.url if obj.image else None
```

This ensures the API returns: `/media/products/image.jpg` instead of Docker-internal URLs like `backend:8000`

4. Commit and push again:
```
git add .
git commit -m "Fix media image URL in serializer"
git push origin main
```
5. Test again.


# RECOMMENDATION FOR SOLVING STATIC AND MEDIA 
```
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR /'static'

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# Tells Django it is running behind an HTTPS proxy 
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True

```
also modifies the ngnix to follow standard of caching 

```
# Redirect all HTTP → HTTPS
server {
    listen 80;
    server_name cognitech.tlms.live www.cognitech.tlms.live;
    return 301 https://$host$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name cognitech.tlms.live www.cognitech.tlms.live;

    # SSL certificate
    ssl_certificate /etc/letsencrypt/live/cognitech.tlms.live/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cognitech.tlms.live/privkey.pem;

    # ---------- Frontend ----------
    location / {
        proxy_pass http://frontend:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # ---------- API ----------
    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # ---------- Django Admin ----------
    location /admin/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
    }

    # ---------- Static ----------
    location /static/ {
        alias /static/;
        access_log off;
        expires 30d;
        add_header Cache-Control "public";
    }

    # ---------- Media ----------
    location /media/ {
        alias /media/;
        access_log off;
        expires 7d;
        add_header Cache-Control "public";
    }
}


```
