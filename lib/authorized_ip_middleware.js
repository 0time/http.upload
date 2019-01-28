const Network = require('cidr-grep/lib/network');
const config = require('../config');

const cidrCheck = (cidr, ip) => Network.create(cidr).contains(ip);

module.exports = (req, res, next) => {
  //const ip = req.connection.remoteAddress;
  //const ip = req.connection.remoteAddress.replace(/^::ffff:/, '');
  let authorized = false;

  if (config.publicPaths) {
    if (config.publicPaths.find(publicPath => req.path.startsWith(publicPath)) !== undefined) {
      console.error(req.path);
      authorized = true;
    }
  }

  const ip = req.header('X-Forwarded-For') || req.connection.remoteAddress;

  authorized = config.authorized.reduce(
    (acc, cidr) => (acc ? acc : cidrCheck(cidr, ip)),
    authorized,
  );

  if (authorized) {
    return next();
  } else {
    const response = {
      message: 'Unauthorized',
      ip,
    };

    console.error(response);

    return res.status(401).send(response);
  }
};
