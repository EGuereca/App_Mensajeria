# client/Dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5173

# "--host" es OBLIGATORIO para que Vite funcione dentro de Docker
CMD ["npm", "run", "dev", "--", "--host"]