function getHelloMessage(name) {
  const safe = String(name || 'world').slice(0, 64);
  return `hello-${safe}`;
}

module.exports = { getHelloMessage };

