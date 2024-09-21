FROM node:22

WORKDIR /app

COPY . /app

RUN npm install \
    && npm run test \
    && npm run build

EXPOSE 8080

CMD [ "./node_modules/.bin/http-server", "dist" ]
