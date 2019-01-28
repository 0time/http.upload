const logRequest = (req, res, next) => {
  console.error({
    query: req.query,
    path: req.path,
  });

  return next();
};

module.exports = logRequest;
