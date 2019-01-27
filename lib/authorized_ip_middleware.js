const Network = require('cidr-grep/lib/network');
const config = require('../config');

const cidrCheck = (cidr, ip) => Network.create(cidr).contains(ip);

module.exports = (req, res, next) => {
  //const ip = req.connection.remoteAddress;
  //const ip = req.connection.remoteAddress.replace(/^::ffff:/, '');
  console.error(req.headers);

  const ip = req.header('X-Forwarded-For') || req.connection.remoteAddress;

  const authorized = config.authorized.reduce(
    (acc, cidr) => (acc ? acc : cidrCheck(cidr, ip)),
    false,
  );

  if (authorized) {
    next();
  } else {
    const response = {
      message: 'Unauthorized',
      ip,
    };

    console.error(response);

    res.status(401).send(response);
  }
};
