FROM node:22-alpine

WORKDIR /app

# Copiamos primero los package para aprovechar el caché de Docker
COPY package*.json ./

# Instalamos dependencias
RUN npm install

# Copiamos el resto del código
COPY . .

# Exponemos el puerto del backend
EXPOSE 5000

# Comando de inicio (asegúrate de tener "dev": "nodemon index.js" en tu package.json)
CMD ["npm", "run", "dev"]