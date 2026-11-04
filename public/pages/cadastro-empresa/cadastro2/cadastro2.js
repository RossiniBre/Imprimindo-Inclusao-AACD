// Máscara de CEP: 00000-000
document.getElementById('cep')?.addEventListener('input', e => {
  e.target.value = e.target.value
    .replace(/\D/g, '')
    .slice(0, 8)
    .replace(/^(\d{5})(\d)/, '$1-$2');
});
