const util = require('util');

module.exports = {
  version: version
};

function version(req, res) {
  // variables defined in the Swagger document can be referenced using req.swagger.params.{parameter_name}
  res.json({ version: 'Mocked depinus version 1.2.3' });
}
