document.addEventListener("DOMContentLoaded", function() {
  const payloadType = document.querySelectorAll('input[name="payload_type"]');
  payloadType.forEach(el => {
    el.addEventListener("change", function() {
      switch (el.value) {
        case "gps": {
          document.getElementById("coords_payload").style.display = "block";
          document.getElementById("custom_payload").style.display = "none";
          break;
        }
        case "custom": {
          document.getElementById("coords_payload").style.display = "none";
          document.getElementById("custom_payload").style.display = "block";
          break;
        }
      }
    });
  });

  document.querySelector("form").addEventListener("submit", function(e) {
    e.preventDefault();
    const payload = getPayload.apply(this);
    sendData(payload);
  });

  function getPayload() {
    const type = this.elements.namedItem("payload_type").value;
    let payload = {};
    if (type === "gps") {
      payload = {
        latitude: this.elements.namedItem("latitude").value,
        longitude: this.elements.namedItem("longitude").value
      };
    } else if (type === "custom") {
      payload = {
        payload: this.elements.namedItem("custom").value
      };
    }
    const timestamp = Math.round(new Date().getTime() / 1000.0);
    payload = { ...payload, type, timestamp };
    return payload;
  }

  function sendData(payload) {
    fetch("http://localhost:8080/", {
      credentials: "same-origin",
      body: JSON.stringify(payload),
      headers: {
        "content-type": "application/json"
      },
      method: "POST"
    });
  }

  function updateResponse(response) {
    document.querySelector("#response").innerHTML += `<div>${response}</div>`;
  }

  const ev = new EventSource("http://localhost:8040/mqtt");
  ev.addEventListener("mqtt", function(val) {
    updateResponse(val.data);
  });
});
