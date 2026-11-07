FROM node:22-alpine AS production
WORKDIR /app
COPY package.json server.js ./
RUN addgroup -g 10001 -S app && adduser -S -D -H -u 10001 -G app app
USER 10001:10001
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:8080/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
