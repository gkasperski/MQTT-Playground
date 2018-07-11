const amqp = require("amqplib/callback_api");
const sse = require("sse-nodejs");
const express = require("express");
const app = express();
const cors = require("cors");
const Rx = require("rxjs");
const bodyParser = require("body-parser");

const QUEUE_NAME = "conti_poc";
const QUEUE_CUSTOM = "conti_poc_custom";

const eventStream = new Rx.Subject();
app.use(cors());
app.use(bodyParser.json());

app.get("/mqtt", function(req, res) {
  const app = sse(res);
  eventStream.subscribe(val => app.sendEvent("mqtt", val));
});

function handleQueue(queue, callback) {
  return function(error, channel) {
    channel.assertQueue(queue, { durable: true });
    channel.prefetch(1);
    channel.consume(queue, msg => callback(msg, channel), { noAck: false });
  };
}

amqp.connect(
  "amqp://localhost",
  (error, connection) => {
    // gps coordinates via IEEE 754 FLOATS
    connection.createChannel(
      handleQueue(QUEUE_NAME, function(msg, channel) {
        console.log(" [x] Received", msg.content);
        const coordX = msg.content.slice(4, 8);
        const coordY = msg.content.slice(8, 12);
        const timestamp = msg.content.slice(0, 4);
        eventStream.next({
          ...msg.content.toJSON(),
          payloadSize: `${msg.content.byteLength} bytes`,
          parsed: `${coordX.readFloatBE()}, ${coordY.readFloatBE()}, ${timestamp.readInt32BE()}`
        });
        channel.ack(msg);
      })
    );

    // custom messages
    connection.createChannel(
      handleQueue(QUEUE_CUSTOM, function(msg, channel) {
        console.log(" [x] Received", msg.content);
        const timestamp = msg.content.slice(0, 4);
        const payload = msg.content.slice(4);

        eventStream.next({
          ...msg.content.toJSON(),
          payloadSize: `${msg.content.byteLength} bytes`,
          timestamp: timestamp.readInt32BE(),
          parsed: payload.toString()
        });
        channel.ack(msg);
      })
    );
  }
);

app.listen(8040, () => console.log("Listening on 8040"));
