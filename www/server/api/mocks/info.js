module.exports = {
  info: info
};

function info(req, res) {

  var title = 'Depinus - DEtachable PIaNo UnSilencer';
  var debianPackagegData = { foo: "bar", bar: "baz" };

  res.json({ title: title, debianPackageData: debianPackagegData });
}
