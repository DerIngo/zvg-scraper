# zvg-scraper
Webscraper for zvg-portal.de for my n8n workflow

# Installation
## Files
Copy files into your n8n installation folder in: n8n/data/zvg
## Docker Compose
Add in docker-compose.yml-File:
´´´yml
services:
  postgres:
    [...]

  n8n:
    [..]
    networks:
      - n8n-network
    [...]

  zvg_scraper:
    build:
      context: ./data/zvg
    container_name: zvg_scraper
    restart: unless-stopped
    environment:
      - TZ=Europe/Berlin
    networks:
      - n8n-network

  [...]

´´´
