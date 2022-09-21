FROM --platform=linux/amd64 node:18-alpine
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY package.json /usr/src/app
RUN npm cache verify
RUN npm install
COPY . /usr/src/app
EXPOSE 3000
CMD ["node","app.js"]