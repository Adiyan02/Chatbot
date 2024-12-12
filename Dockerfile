# Build-Stage
FROM node:20-slim as build

WORKDIR /app

# Installiere Dependencies
COPY package*.json ./
RUN npm install

# Kopiere Quellcode und erzeuge Build
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Production-Stage
FROM nginx:alpine

# Kopiere Build-Dateien in nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Konfiguriere nginx für React-Router
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Starte nginx
CMD ["nginx", "-g", "daemon off;"]
