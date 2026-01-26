# Stage 1: Build
# get image of node version 18 from docker hub
# FROM node:18 → start with Node.js 18 image (has Node + npm installed)
# AS build → names this stage "build" so we can reference it later
FROM node:18 AS build


# Sets /app as the working directory in the container
WORKDIR /app

# copy package.json and package-lock.json to the workdir /app  like copy requirements.txt in backend
# Why copy only package files first? Docker caches this layer If your package.json doesn’t change, Docker won’t re-run npm install → faster builds
COPY package*.json ./

# install all npm dependencies
RUN npm install

# Copy all your React source code to /app
COPY . .
# Now we have both code and dependencies inside the container

# ARG → build-time variable (only exists while building the image)
# This line defines a build-time variable named VITE_SERVER_BASE_URL that can be passed when building the Docker image.
ARG VITE_SERVER_BASE_URL

# ENV → runtime environment variable inside the container
# This line passes an environment variable into the Docker container so the React app knows the backend API URL.
ENV VITE_SERVER_BASE_URL=$VITE_SERVER_BASE_URL

# build the React app for production
# Output goes into /app/dist (or /app/build depending on your Vite/React config)
RUN npm run build

# # Starts with tiny Nginx image (alpine = lightweight Linux)
# # get image of nginx alpine from docker hub
# # Nginx will serve your static React files
# FROM nginx:alpine

# # Copy build output to Nginx html directory
# # This line copies the built React app from the previous build stage into the Nginx web server's default directory for serving static files.
# COPY --from=build /app/dist /usr/share/nginx/html

# # Expose port 80
# EXPOSE 80

# # Start Nginx server
# # Starts Nginx in the foreground (required in Docker)
# # daemon off; → ensures Nginx does not run as a background process, otherwise the container exits immediately
# CMD ["nginx", "-g", "daemon off;"]