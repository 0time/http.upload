FROM keymux/docker-ubuntu-nvm-yarn

WORKDIR /app

EXPOSE 3000

COPY . /app/

CMD [ "yarn", "start" ]
