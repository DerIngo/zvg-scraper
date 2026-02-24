# zvg-scraper
Webscraper for zvg-portal.de for my n8n workflow

# Installation
## Files
Copy files into your n8n installation folder in: n8n/data/zvg
## Docker Compose
Add in docker-compose.yml-File:

```yml
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
```

## n8n
n8n Node Code:
```javascript
{
  "nodes": [
    {
      "parameters": {
        "url": "http://zvg_scraper:3000/scrape",
        "sendQuery": true,
        "queryParameters": {
          "parameters": [
            {
              "name": "land_abk",
              "value": "nw"
            },
            {
              "name": "ger_name",
              "value": "Ahaus"
            },
            {
              "name": "ger_id",
              "value": "R2701"
            }
          ]
        },
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [
        1616,
        -816
      ],
      "id": "fdef3f6a-5667-41d7-b038-c2fc396f9295",
      "name": "HTTP Request"
    }
  ],
  "connections": {
    "HTTP Request": {
      "main": [
        []
      ]
    }
  },
  "pinData": {},
  "meta": {
    "templateCredsSetupCompleted": true,
    "instanceId": "d48c684288b1fd478c4349d9685d97fea8463955dfbc7c5fea70a2f7299096b0"
  }
}
```
