import Fastify from "fastify";
import websocket from "@fastify/websocket";
import fs from "node:fs";
import { resolve, normalize } from "node:path";
import Handlebars from "handlebars";
import mimeTypes from "mime-types";
import prettyBytes from "pretty-bytes";
import chokidar from "chokidar";
import { format } from "date-fns";

const port = 8080;
const host = "0.0.0.0";

const sharePath = normalize(process.env.SHARE_PATH);

if (!fs.existsSync(sharePath)) {
  throw new Error("Share path does not exist!");
}

const fastify = Fastify({ logger: true });
const stacheFile = fs.readFileSync(
  resolve(import.meta.dirname, "index.handlebars"),
  "utf-8",
);
const template = Handlebars.compile(stacheFile);

// Register websocket plugin
await fastify.register(websocket);

let currentFiles = [];
let clients = new Set();

function broadcast(message) {
  for (const client of clients) {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  }
}

chokidar
  .watch(sharePath)
  .on("add", (fullPath, stats) => {
    const size = stats ? prettyBytes(stats.size) : 0;
    const splitPath = fullPath.split(sharePath)[1];
    const path = normalize(splitPath).slice(1);
    const modified = format(stats.mtime, "M/d/yyyy h:mm a");

    currentFiles.push({ path, size, modified, fullPath });
    broadcast("files_changed");

    fastify.log.info(`File added ${path}`);
  })
  .on("unlink", (fullPath) => {
    currentFiles = currentFiles.filter((file) => file.fullPath !== fullPath);
    broadcast("files_changed");

    fastify.log.info("File deleted");
  });

fastify.get("/", (_, reply) => {
  reply.type("text/html").code(200).send(template({ sharePath, currentFiles }));
});

fastify.get("/download/*", (request, reply) => {
  const [, file] = request.url.split("/download/");
  const filePath = resolve(sharePath, file);

  if (fs.existsSync(filePath)) {
    const mType = mimeTypes.lookup(file) || "application/octet-stream";

    reply.code(200).type(mType).send(fs.createReadStream(filePath));
  } else {
    reply.code(404).send();
  }
});

fastify.get("/ws", { websocket: true }, (socket) => {
  clients.add(socket);

  socket.on("close", () => {
    clients.delete(socket);
  });
});

try {
  await fastify.listen({ port, host });
} catch (error) {
  fastify.log.error(error);
  process.exit(1);
}
