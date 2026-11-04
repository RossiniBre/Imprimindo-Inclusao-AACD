// ao abrir a janela de aceitar/recusar: preenche com os dados do card que foi clicado
document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('show.bs.modal', e => {
    const pedido = e.relatedTarget.closest('.pedido');
    pedido.dataset.impressora = pedido.querySelector('select').value;
    modal.querySelectorAll('[data-campo]').forEach(el => el.textContent = pedido.dataset[el.dataset.campo]);
    modal.querySelector('[name=pedido]').value = pedido.dataset.pedido;
    modal.querySelector('[name=impressora]').value = pedido.dataset.impressora;
  });
});