(function () {
 
  var SENSIVEIS = ['senha', 'password', 'identificador', 'token', 'sessao'];
  var params = new URLSearchParams(location.search);
  if (SENSIVEIS.some(function (k) { return params.has(k); })) {
    history.replaceState(null, '', location.pathname + location.hash);
  }

  document.addEventListener('submit', function (e) {
    if (!e.defaultPrevented) e.preventDefault();
  });
})();