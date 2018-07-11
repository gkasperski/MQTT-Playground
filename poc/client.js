const amqp = require("amqplib/callback_api");
const QUEUE_NAME = "conti_poc";
const QUEUE_CUSTOM = "conti_poc_custom";
const express = require("express");
const cors = require("cors");
const app = express();
const bodyParser = require("body-parser");

app.use(cors());
app.use(bodyParser.json());

app.post("/", function(req, res) {
  const timestamp = parseInt(req.body.timestamp);
  if (req.body.type === "gps") {
    const latitude = parseFloat(req.body.latitude);
    const longitude = parseFloat(req.body.longitude);
    const data = new Float32Array([latitude, longitude]);
    const buffer = new Buffer(12);

    // writing data and timestamp to buffer
    buffer.writeInt32BE(timestamp);
    data.forEach((el, index) => buffer.writeFloatBE(el, (index + 1) * 4));
    
    sendData(buffer, QUEUE_NAME);
    res.send(buffer.toJSON());
  } else if (req.body.type === "custom") {
    const payload = Buffer.from(req.body.payload);
    const timestamp = new Buffer(4);
    timestamp.writeInt32BE(req.body.timestamp);

    const buffer = Buffer.concat([timestamp, payload]);
    sendData(buffer, QUEUE_CUSTOM);
    res.send(buffer.toJSON());
  }
});

function sendData(buffer, queue) {
  amqp.connect(
    "amqp://localhost",
    function(error, connection) {
      connection.createChannel(function(error, channel) {
        console.log(buffer);
        console.log("Sending to receiver");
        channel.assertQueue(queue, { durable: true });
        channel.sendToQueue(queue, buffer, {
          persistent: true
        });
        setTimeout(function() {
          connection.close();
        }, 500);
      });
    }
  );
}

app.listen(8080, () => console.log("Listening on 8080"));
