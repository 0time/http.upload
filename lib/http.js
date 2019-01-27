const ensureResponse = res => inp => {
  if (!res.headersSent) {
    res.sendStatus(500);
  }

  return inp;
};

const logAndReject = message => {
  console.error(message);

  return Promise.reject(message);
};

const logRequest = req => {
  console.error({
    query: req.query,
    body: req.body,
  });

  return req;
};

module.exports = {
  ensureResponse,
  logAndReject,
  logRequest,
};
