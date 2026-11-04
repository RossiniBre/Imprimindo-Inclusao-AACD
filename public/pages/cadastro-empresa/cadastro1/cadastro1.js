// Mostrar / ocultar senha
document.querySelectorAll('.botao-senha').forEach(botao => {
  botao.addEventListener('click', () => {
    const input = document.getElementById(botao.dataset.target);
    const mostrar = input.type === 'password';

    input.type = mostrar ? 'text' : 'password';
    botao.querySelector('i').className = mostrar ? 'bi bi-eye-slash' : 'bi bi-eye';
  });
});

// Máscara de CNPJ: 00.000.000/0000-00
document.getElementById('cnpj').addEventListener('input', e => {
  e.target.value = e.target.value
    .replace(/\D/g, '')
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
});

// Máscara de telefone: (00) 00000-0000 (ou (00) 0000-0000)
document.getElementById('telefone').addEventListener('input', e => {
  e.target.value = e.target.value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{4,5})(\d{4})$/, '$1-$2');
});