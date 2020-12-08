const axios = require("axios");
const qs = require("qs");

function config(settings) {
  const data = qs.stringify({
    channel: settings.channelID,
    text: settings.text,
    as_user: true,
  });
  const config = {
    method: "post",
    url: "https://slack.com/api/chat.postMessage",
    headers: {
      Authorization: "Bearer " + settings.token,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    data: data,
  };
  return config;
}

const msgaxios = function (settings) {
  const configData = config(settings);
  return axios(configData);
};

module.exports = msgaxios;
